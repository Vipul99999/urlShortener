import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersRepository } from './users.repository.js'
import { toPublicWorkspaceRole } from '../../common/utils/workspace-roles.js'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional()
})

export class UsersService {
  private repo: UsersRepository

  constructor(private app: FastifyInstance) {
    this.repo = new UsersRepository(app)
  }

  async me(userId: string) {
    const user = await this.repo.findUserById(userId)

    if (!user) {
      throw this.app.httpErrors.notFound('User not found')
    }

    return user
  }

  async updateMe(userId: string, input: unknown) {
    const data = updateProfileSchema.parse(input)

    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw this.app.httpErrors.notFound('User not found')
    }

    return this.repo.updateUser(userId, {
      name: data.name,
      avatarUrl: data.avatarUrl
    })
  }

  async listWorkspaceMembers(workspaceId: string, userId: string) {
    const membership = await this.repo.findWorkspaceMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    const members = await this.repo.listWorkspaceMembers(workspaceId)

    return members.map((member) => ({
      ...member,
      role: toPublicWorkspaceRole(member.role)
    }))
  }
}
