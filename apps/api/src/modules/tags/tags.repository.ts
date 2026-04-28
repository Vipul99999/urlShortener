import type { FastifyInstance } from 'fastify'

export class TagsRepository {
  constructor(private app: FastifyInstance) {}

  findMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      select: { id: true }
    })
  }

  listTags(workspaceId: string) {
    return this.app.prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    })
  }

  findTag(workspaceId: string, tagId: string) {
    return this.app.prisma.tag.findFirst({
      where: {
        id: tagId,
        workspaceId
      }
    })
  }

  createTag(data: { workspaceId: string; name: string; color?: string }) {
    return this.app.prisma.tag.create({
      data
    })
  }

  updateTag(tagId: string, data: { name?: string; color?: string }) {
    return this.app.prisma.tag.update({
      where: { id: tagId },
      data
    })
  }

  deleteTag(workspaceId: string, tagId: string) {
    return this.app.prisma.tag.deleteMany({
      where: {
        id: tagId,
        workspaceId
      }
    })
  }

  findLink(workspaceId: string, linkId: string) {
    return this.app.prisma.link.findFirst({
      where: {
        id: linkId,
        workspaceId,
        deletedAt: null
      },
      select: { id: true }
    })
  }

  attachTag(linkId: string, tagId: string) {
    return this.app.prisma.linkTag.create({
      data: {
        linkId,
        tagId
      }
    })
  }

  detachTag(linkId: string, tagId: string) {
    return this.app.prisma.linkTag.deleteMany({
      where: {
        linkId,
        tagId
      }
    })
  }
}