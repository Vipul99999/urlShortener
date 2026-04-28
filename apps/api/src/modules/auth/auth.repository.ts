import type { FastifyInstance } from "fastify";

export class AuthRepository {
  constructor(private app: FastifyInstance) {}

  findUserByEmail(email: string) {
    return this.app.prisma.user.findUnique({
      where: { email },
    });
  }

  findUserById(id: string) {
    return this.app.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  findFirstWorkspaceMembership(userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
    });
  }

  findSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.app.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
    });
  }

  revokeSessionById(sessionId: string) {
    return this.app.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.app.prisma.session.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createUserWithDefaultWorkspace(data: {
    email: string;
    passwordHash: string;
    name?: string;
    workspaceSlug: string;
    workspaceName: string;
  }) {
    return this.app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: data.workspaceName,
          slug: data.workspaceSlug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return { user, workspace };
    });
  }

  createSession(data: {
    userId: string;
    refreshTokenHash: string;
    jti: string;
    expiresAt: Date;
  }) {
    return this.app.prisma.session.create({
      data,
    });
  }

  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.app.prisma.passwordResetToken.create({
      data,
    });
  }

  findPasswordResetTokenByHash(tokenHash: string) {
    return this.app.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  markPasswordResetTokenUsed(id: string) {
    return this.app.prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  deletePasswordResetTokensForUser(userId: string) {
    return this.app.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }

  createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.app.prisma.emailVerificationToken.create({
      data,
    });
  }

  findEmailVerificationTokenByHash(tokenHash: string) {
    return this.app.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  markEmailVerificationTokenUsed(id: string) {
    return this.app.prisma.emailVerificationToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  deleteEmailVerificationTokensForUser(userId: string) {
    return this.app.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.app.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  markUserEmailVerified(userId: string) {
    return this.app.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }
}
