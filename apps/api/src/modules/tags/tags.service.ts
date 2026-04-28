import type { FastifyInstance } from 'fastify'
import { Prisma } from '@repo/db'
import { TagsRepository } from './tags.repository.js'
import { attachTagSchema, createTagSchema, updateTagSchema } from './tags.schemas.js'
import { AuditService } from '../audit/audit.service.js'
export class TagsService {
  private repo: TagsRepository
  private audit: AuditService


  constructor(private app: FastifyInstance) {
    this.repo = new TagsRepository(app)
    this.audit = new AuditService(app)
  }

  async list(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)
    return this.repo.listTags(workspaceId)
  }

  async create(workspaceId: string, userId: string, input: unknown) {
    await this.ensureMembership(workspaceId, userId)

    const data = createTagSchema.parse(input)

    try {
  const created = await this.repo.createTag({
    workspaceId,
    name: data.name.trim(),
    color: data.color
  })

  await this.audit.log({
    workspaceId,
    actorUserId: userId,
    action: 'tag.create',
    entityType: 'tag',
    entityId: created.id,
    metadataJson: {
      name: created.name,
      color: created.color
    }
  })

  return created
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw this.app.httpErrors.conflict('Tag already exists')
  }
  throw error
}
  }

  async update(workspaceId: string, tagId: string, userId: string, input: unknown) {
    await this.ensureMembership(workspaceId, userId)

    const data = updateTagSchema.parse(input)

    const existing = await this.repo.findTag(workspaceId, tagId)
    if (!existing) {
      throw this.app.httpErrors.notFound('Tag not found')
    }

   const updated = await this.repo.updateTag(tagId, {
  name: data.name?.trim(),
  color: data.color
})

await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'tag.update',
  entityType: 'tag',
  entityId: tagId,
  metadataJson: {
    name: data.name,
    color: data.color
  }
})

return updated
  }

  async remove(workspaceId: string, tagId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const result = await this.repo.deleteTag(workspaceId, tagId)
    if (result.count === 0) {
      throw this.app.httpErrors.notFound('Tag not found')
    }
    await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'tag.delete',
  entityType: 'tag',
  entityId: tagId
})

    return { success: true }
  }

  async attachToLink(workspaceId: string, linkId: string, userId: string, input: unknown) {
    await this.ensureMembership(workspaceId, userId)

    const { tagId } = attachTagSchema.parse(input)

    const link = await this.repo.findLink(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    const tag = await this.repo.findTag(workspaceId, tagId)
    if (!tag) {
      throw this.app.httpErrors.notFound('Tag not found')
    }

    try {
      await this.repo.attachTag(linkId, tagId)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { success: true }
      }
      throw error
    }
    await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'tag.attach_to_link',
  entityType: 'link_tag',
  entityId: linkId,
  metadataJson: {
    tagId
  }
})

    return { success: true }
  }

  async detachFromLink(workspaceId: string, linkId: string, tagId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const link = await this.repo.findLink(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    await this.repo.detachTag(linkId, tagId)
    await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'tag.detach_from_link',
  entityType: 'link_tag',
  entityId: linkId,
  metadataJson: {
    tagId
  }
})
    return { success: true }
  }

  private async ensureMembership(workspaceId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }
  }
}