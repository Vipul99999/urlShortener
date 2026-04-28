import type { FastifyPluginAsync } from 'fastify'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService(app)
  const controller = new AuthController(service)

  app.post('/register', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, controller.register)
  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '10 minutes'
      }
    }
  }, controller.login)
  app.post('/refresh', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, controller.refresh)
  app.post('/logout', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, controller.logout)

  app.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '10 minutes'
      }
    }
  }, controller.forgotPassword)
  app.post('/reset-password', {
    config: {
      rateLimit: {
        max: 12,
        timeWindow: '10 minutes'
      }
    }
  }, controller.resetPassword)
  app.post('/resend-verification', {
    config: {
      rateLimit: {
        max: 4,
        timeWindow: '10 minutes'
      }
    }
  }, controller.resendVerification)
  app.get('/verify-email', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '10 minutes'
      }
    }
  }, controller.verifyEmail)

app.get('/me', { preHandler: [app.authenticateUser] }, controller.me)
app.post('/change-password', { preHandler: [app.authenticateUser] }, controller.changePassword)
}
