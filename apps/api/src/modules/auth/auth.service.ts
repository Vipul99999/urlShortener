import argon2 from "argon2";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { enqueueJob, type Prisma } from "@repo/db";
import { JOB_KIND } from "@repo/shared";
import { AuthRepository } from "./auth.repository.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import { env } from "../../config/env.js";
import { AuditService } from '../audit/audit.service.js'
import { securityGuard } from '../../common/utils/security-guard.js'
import { recordAbuseSignal } from '../../common/utils/abuse-monitor.js'

function makeOneTimeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function makeWorkspaceSlug() {
  return `ws-${crypto.randomBytes(6).toString("hex")}`;
}

function refreshExpiry(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export class AuthService {
  private repo: AuthRepository;
private audit: AuditService

  constructor(private app: FastifyInstance) {
  this.repo = new AuthRepository(app)
  this.audit = new AuditService(app)
}

  async register(input: unknown) {
    const data = registerSchema.parse(input);

    const existing = await this.repo.findUserByEmail(data.email);
    if (existing) {
      throw this.app.httpErrors.conflict("Email already in use");
    }

    const passwordHash = await argon2.hash(data.password);

    const workspaceName = data.name
      ? `${data.name}'s Workspace`
      : "My Workspace";

    const result = await this.repo.createUserWithDefaultWorkspace({
      email: data.email,
      passwordHash,
      name: data.name,
      workspaceSlug: makeWorkspaceSlug(),
      workspaceName,
    });

    const rawToken = makeOneTimeToken();
    const tokenHash = sha256(rawToken);

    await this.repo.deleteEmailVerificationTokensForUser(result.user.id);
    await this.repo.createEmailVerificationToken({
      userId: result.user.id,
      tokenHash,
      expiresAt: hoursFromNow(24),
    });

    const verifyUrl = `${process.env.FRONTEND_URL || process.env.APP_URL}/verify-email?token=${rawToken}`

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.SEND_VERIFICATION_EMAIL,
      payload: {
        to: result.user.email,
        name: result.user.name,
        verifyUrl,
        workspaceId: result.workspace.id,
        triggeredByUserId: result.user.id
      } as Prisma.InputJsonValue
    })

const sessionResult = await this.createSession(result.user.id, result.workspace.id)

await this.audit.log({
  workspaceId: result.workspace.id,
  actorUserId: result.user.id,
  action: 'auth.register',
  entityType: 'user',
  entityId: result.user.id,
  metadataJson: {
    email: result.user.email
  }
})

return sessionResult
    
  }

  async login(input: unknown, context?: { ipAddress?: string | null; userAgent?: string | null }) {
    const data = loginSchema.parse(input);
    const lockKeys = [
      `auth:login:email:${data.email.toLowerCase()}`,
      context?.ipAddress ? `auth:login:ip:${context.ipAddress}` : null
    ].filter((value): value is string => Boolean(value))

    for (const key of lockKeys) {
      const lockedUntil = securityGuard.getLock(key)
      if (lockedUntil) {
        await recordAbuseSignal(this.app, {
          source: 'auth',
          kind: 'credential_stuffing_lockout',
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
          actionTaken: 'blocked',
          metadataJson: {
            email: data.email,
            lockedUntil: new Date(lockedUntil).toISOString()
          }
        })
        throw this.app.httpErrors.tooManyRequests("Too many login attempts. Please try again later.");
      }
    }

    const user = await this.repo.findUserByEmail(data.email);

    if (!user?.passwordHash) {
      this.recordLoginFailure(data.email, context)
      throw this.app.httpErrors.unauthorized("Invalid credentials");
    }

    const valid = await argon2.verify(user.passwordHash, data.password);
    if (!valid) {
      this.recordLoginFailure(data.email, context)
      throw this.app.httpErrors.unauthorized("Invalid credentials");
    }

    for (const key of lockKeys) {
      securityGuard.clear(key)
    }

    const membership = await this.repo.findFirstWorkspaceMembership(user.id);
    if (!membership) {
      throw this.app.httpErrors.forbidden("Workspace not found");
    }

    const sessionResult = await this.createSession(user.id, membership.workspaceId)

await this.audit.log({
  workspaceId: membership.workspaceId,
  actorUserId: user.id,
  action: 'auth.login',
  entityType: 'session',
  entityId: sessionResult.sessionId
})

return sessionResult
  }

  async refresh(input: unknown) {
    const { refreshToken } = refreshSchema.parse(input);
    const refreshTokenHash = sha256(refreshToken);

    const session =
      await this.repo.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw this.app.httpErrors.unauthorized("Invalid refresh token");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw this.app.httpErrors.unauthorized("Refresh token expired");
    }

    const membership = await this.repo.findFirstWorkspaceMembership(
      session.userId,
    );
    if (!membership) {
      throw this.app.httpErrors.forbidden("Workspace not found");
    }

    await this.repo.revokeSessionById(session.id);

    return this.createSession(session.userId, membership.workspaceId);
  }

  async logout(input: unknown) {
    const { refreshToken } = refreshSchema.parse(input);
    const refreshTokenHash = sha256(refreshToken);

    await this.repo.revokeSessionByRefreshTokenHash(refreshTokenHash);

    await this.audit.log({
  actorUserId: null,
  action: 'auth.logout',
  entityType: 'session',
  entityId: null,
  metadataJson: {
    refreshTokenRevoked: true
  }
})

return { success: true };
  }

  async me(userId: string) {
    return this.repo.findUserById(userId);
  }

  private async createSession(userId: string, workspaceId: string) {
    const refreshToken = makeRefreshToken();
    const refreshTokenHash = sha256(refreshToken);
    const jti = crypto.randomUUID();

    const session = await this.repo.createSession({
      userId,
      refreshTokenHash,
      jti,
      expiresAt: refreshExpiry(env.REFRESH_TOKEN_TTL_DAYS),
    });

    const accessToken = this.app.jwt.sign(
      {
        sub: userId,
        sessionId: session.id,
        workspaceId,
      },
      {
        expiresIn: env.ACCESS_TOKEN_TTL,
      },
    );

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      workspaceId,
    };
  }
  async forgotPassword(input: unknown) {
    const data = forgotPasswordSchema.parse(input);

    const user = await this.repo.findUserByEmail(data.email);

    // Prevent email enumeration
    if (!user) {
      return { success: true };
    }

    const rawToken = makeOneTimeToken();
    const tokenHash = sha256(rawToken);

    await this.repo.deletePasswordResetTokensForUser(user.id);
    await this.repo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: minutesFromNow(30),
    });

    const resetUrl = `${process.env.FRONTEND_URL || process.env.APP_URL}/reset-password?token=${rawToken}`

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.SEND_PASSWORD_RESET_EMAIL,
      payload: {
        to: user.email,
        name: user.name,
        resetUrl,
        triggeredByUserId: user.id
      } as Prisma.InputJsonValue
    })

return { success: true };
  }

  async resetPassword(input: unknown) {
    const data = resetPasswordSchema.parse(input);
    const tokenHash = sha256(data.token);

    const resetToken = await this.repo.findPasswordResetTokenByHash(tokenHash);

    if (!resetToken || resetToken.usedAt) {
      throw this.app.httpErrors.badRequest("Invalid or used reset token");
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      throw this.app.httpErrors.badRequest("Reset token expired");
    }

    const passwordHash = await argon2.hash(data.password);

    await this.repo.updateUserPassword(resetToken.userId, passwordHash);
    await this.repo.markPasswordResetTokenUsed(resetToken.id);

    await this.audit.log({
  actorUserId: resetToken.userId,
  action: 'auth.reset_password',
  entityType: 'user',
  entityId: resetToken.userId
})

return { success: true };
  }

  async resendVerification(input: unknown) {
    const data = resendVerificationSchema.parse(input);

    const user = await this.repo.findUserByEmail(data.email);

    // prevent enumeration
    if (!user || user.emailVerified) {
      return { success: true };
    }

    const rawToken = makeOneTimeToken();
    const tokenHash = sha256(rawToken);

    await this.repo.deleteEmailVerificationTokensForUser(user.id);
    await this.repo.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      expiresAt: hoursFromNow(24),
    });

    const verifyUrl = `${process.env.FRONTEND_URL || process.env.APP_URL}/verify-email?token=${rawToken}`

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.SEND_VERIFICATION_EMAIL,
      payload: {
        to: user.email,
        name: user.name,
        verifyUrl,
        triggeredByUserId: user.id
      } as Prisma.InputJsonValue
    })

return { success: true };
  }

  async verifyEmail(input: unknown) {
    const data = verifyEmailSchema.parse(input);
    const tokenHash = sha256(data.token);

    const verificationToken =
      await this.repo.findEmailVerificationTokenByHash(tokenHash);

    if (!verificationToken || verificationToken.usedAt) {
      throw this.app.httpErrors.badRequest(
        "Invalid or used verification token",
      );
    }

    if (verificationToken.expiresAt.getTime() < Date.now()) {
      throw this.app.httpErrors.badRequest("Verification token expired");
    }

    await this.repo.markUserEmailVerified(verificationToken.userId);
    await this.repo.markEmailVerificationTokenUsed(verificationToken.id);
await this.audit.log({
  actorUserId: verificationToken.userId,
  action: 'auth.verify_email',
  entityType: 'user',
  entityId: verificationToken.userId
})

return { success: true };
  }

  async changePassword(userId: string, input: unknown) {
    const data = changePasswordSchema.parse(input);

    const user = await this.repo.findUserById(userId);
    const fullUser = await this.repo.findUserByEmail(user?.email || "");

    if (!fullUser?.passwordHash) {
      throw this.app.httpErrors.badRequest(
        "Password login is not available for this account",
      );
    }

    const valid = await argon2.verify(
      fullUser.passwordHash,
      data.currentPassword,
    );

    if (!valid) {
      throw this.app.httpErrors.unauthorized("Current password is incorrect");
    }

    const passwordHash = await argon2.hash(data.newPassword);
    await this.repo.updateUserPassword(userId, passwordHash);
await this.audit.log({
  actorUserId: userId,
  action: 'auth.change_password',
  entityType: 'user',
  entityId: userId
})

return { success: true };
  }

  private recordLoginFailure(email: string, context?: { ipAddress?: string | null; userAgent?: string | null }) {
    for (const key of [
      `auth:login:email:${email.toLowerCase()}`,
      context?.ipAddress ? `auth:login:ip:${context.ipAddress}` : null
    ].filter((value): value is string => Boolean(value))) {
      securityGuard.recordFailure({
        key,
        windowMs: env.AUTH_LOGIN_WINDOW_MS,
        maxAttempts: env.AUTH_LOGIN_MAX_ATTEMPTS,
        lockDurationMs: env.AUTH_LOGIN_LOCK_DURATION_MS
      })
    }

    void recordAbuseSignal(this.app, {
      source: 'auth',
      kind: 'invalid_login_attempt',
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      actionTaken: 'tracked',
      metadataJson: {
        email
      }
    })
  }
}
