import Fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import { env } from "./config/env.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { authPlugin } from "./plugins/auth.js";

import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { workspaceRoutes } from "./modules/workspaces/workspaces.routes.js";
import { linkRoutes } from "./modules/links/links.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { redirectRoutes } from "./modules/redirects/redirects.routes.js";

import { tagRoutes } from "./modules/tags/tags.routes.js";
import { qrRoutes } from "./modules/qr/qr.routes.js";
import { exportRoutes } from "./modules/exports/exports.routes.js";

import { usersRoutes } from "./modules/users/users.routes.js";
import { apiKeysRoutes } from "./modules/api-keys/api-keys.routes.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { invitationRoutes } from "./modules/invitations/invitations.routes.js";
import { domainRoutes } from "./modules/domains/domains.routes.js";
import { emailRoutes } from "./modules/email/email.routes.js";
import { opsRoutes } from "./modules/ops/ops.routes.js";

import { isMailerConfigured, verifyMailerConnection } from './common/utils/mailer.js'
import { redirectCache } from './common/utils/link-cache.js'
import { captureMonitoringError, initMonitoring } from './common/utils/monitoring.js'

export async function buildApp() {
  initMonitoring()
  const app = Fastify({
    logger: true,
  });
  
  if (process.env.NODE_ENV !== 'test') {
    if (isMailerConfigured()) {
      try {
        await verifyMailerConnection()
      } catch (error) {
        app.log.warn({ error }, 'Mailer verification failed; email features may be unavailable')
      }
    } else {
      app.log.warn('Mailer is not configured; email features are disabled')
    }
  }
  await app.register(sensible);
  await app.register(cors, {
    origin: env.APP_URL,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(authPlugin);

  await redirectCache.verifyConnection()

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(workspaceRoutes, { prefix: "/workspaces" });
  await app.register(linkRoutes);
  await app.register(analyticsRoutes);
  await app.register(tagRoutes);
  await app.register(qrRoutes);
  await app.register(exportRoutes);

  await app.register(usersRoutes);
  await app.register(apiKeysRoutes);
  await app.register(auditRoutes);
  await app.register(invitationRoutes);
  await app.register(domainRoutes);
  await app.register(emailRoutes);
  await app.register(opsRoutes);

  await app.register(redirectRoutes);

  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as any).statusCode ?? 500;

    app.log.error(error);

    if (statusCode >= 500) {
      captureMonitoringError(error, {
        tags: {
          area: 'api',
          method: request.method
        },
        extra: {
          path: request.url,
          statusCode
        },
        user: {
          id: request.authUser?.userId
        }
      })
    }

    return reply.status(statusCode).send({
      message: error.message || "Internal Server Error",
    });
  });
  return app;
}
