import type { FastifyInstance } from 'fastify'
import { createWorkspaceSchema, updateWorkspaceSchema } from './workspaces.schemas.js'
import { WorkspacesRepository } from './workspaces.repository.js'
import { AuditService } from '../audit/audit.service.js'
import { toPublicWorkspaceRole } from '../../common/utils/workspace-roles.js'
function slugifyWorkspaceName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export class WorkspacesService {
  private repo: WorkspacesRepository
private audit: AuditService
  constructor(private app: FastifyInstance) {
    this.repo = new WorkspacesRepository(app)
    this.audit = new AuditService(app)
  }

  async listForUser(userId: string) {
    const memberships = await this.repo.listForUser(userId)

    return memberships.map((membership) => ({
      ...membership,
      role: toPublicWorkspaceRole(membership.role)
    }))
  }

  async getById(workspaceId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId)

    if (!membership) {
      throw this.app.httpErrors.notFound('Workspace not found')
    }

    return membership.workspace
  }

  async create(userId: string, input: unknown) {
    const data = createWorkspaceSchema.parse(input)

    let base = slugifyWorkspaceName(data.name)
    if (!base) base = 'workspace'

    let candidate = base
    let slug = base

    for (let i = 0; i < 10; i++) {
      const existing = await this.repo.findBySlug(candidate)
      if (!existing) {
        slug = candidate
        break
      }
      candidate = `${base}-${Math.floor(Math.random() * 100000)}`
    }

    const workspace = await this.repo.createWorkspaceWithOwner({
  userId,
  name: data.name,
  slug
})

await this.audit.log({
  workspaceId: workspace.id,
  actorUserId: userId,
  action: 'workspace.create',
  entityType: 'workspace',
  entityId: workspace.id,
  metadataJson: {
    name: workspace.name,
    slug: workspace.slug
  }
})

return workspace
  }

  async update(workspaceId: string, userId: string, input: unknown) {
    const data = updateWorkspaceSchema.parse(input)

    const membership = await this.repo.findAdminMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Not allowed')
    }

    const updated = await this.repo.updateWorkspace(workspaceId, data)

await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'workspace.update',
  entityType: 'workspace',
  entityId: workspaceId,
  metadataJson: data
})

return updated
  }
}
