import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthService } from './auth.service.js'

export class AuthController {
  constructor(private service: AuthService) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.register(request.body)
    return reply.send(result)
  }

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.login(request.body, {
      ipAddress: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null
    })
    return reply.send(result)
  }

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.refresh(request.body)
    return reply.send(result)
  }

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.logout(request.body)
    return reply.send(result)
  }

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.me(request.authUser.userId)
    return reply.send(result)
  }

  forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await this.service.forgotPassword(request.body)
  return reply.send(result)
}

resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await this.service.resetPassword(request.body)
  return reply.send(result)
}

resendVerification = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await this.service.resendVerification(request.body)
  return reply.send(result)
}

verifyEmail = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await this.service.verifyEmail(request.query)
  return reply.send(result)
}

changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await this.service.changePassword(request.authUser.userId, request.body)
  return reply.send(result)
}
}
