import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteObject, prisma } from '../packages/db/src/index.js'
import {
  runCustomDomainAnalyticsSimulation,
  runExportStorageSimulation,
  runRedisRecoverySimulation,
  runWorkerRecoverySimulation
} from '../scripts/runtime-checks.js'

test('redirect cache recovers after Redis outage', async () => {
  const result = await runRedisRecoverySimulation()

  assert.equal(result.firstRedirectStatus, 302)
  assert.equal(result.secondRedirectStatusWhileRedisDown, 302)
  assert.equal(result.thirdRedirectStatusAfterRedisRestart, 302)
  assert.equal(result.recoveryConfirmed, true)
  assert.match(result.redisValueBeforeRestart, /runtime-redis-check/)
  assert.match(result.redisValueAfterRestart, /runtime-redis-check/)
})

test('stale processing job can be reclaimed and completed', async () => {
  const result = await runWorkerRecoverySimulation()

  assert.equal(result.reclaimedBy, 'runtime-check-recovery')
  assert.equal(result.finalizedJobStatus, 'COMPLETED')
  assert.equal(result.exportStatus, 'COMPLETED')

  await prisma.job.delete({
    where: { id: result.staleJobId }
  })
  await prisma.exportJob.delete({
    where: { id: result.exportJobId }
  })
})

test('custom domain verification and analytics overview work end to end', async () => {
  const result = await runCustomDomainAnalyticsSimulation()

  assert.equal(result.verifyStatus, 200)
  assert.equal(result.redirectStatus, 302)
  assert.equal(result.redirectLocation, 'https://example.com/custom-domain-test')
  assert.equal(result.topReferrer, 'news.ycombinator.com')
  assert.equal(result.topCountry, 'IN')
  assert.match(result.recentClickDomain || '', /runtime\.test/)
  assert.match(result.recentClickSlug || '', /runtime-domain-/)
  assert.equal(result.recentClickDeviceType, 'mobile')

  await prisma.link.delete({
    where: { id: result.linkId }
  })
  await prisma.workspaceDomain.delete({
    where: { id: result.domainId }
  })
  await prisma.job.deleteMany({
    where: {
      id: {
        in: result.queuedClickJobIds
      }
    }
  })
})

test('exports are stored outside PostgreSQL content blobs', async () => {
  const result = await runExportStorageSimulation()

  assert.equal(result.contentWasMovedOutOfDb, true)
  assert.match(result.fileUrl || '', /runtime-export-/)
  assert.match(result.storedContentPreview || '', /id,title,slug,domain/)

  await prisma.exportJob.delete({
    where: { id: result.exportJobId }
  })
  if (result.fileUrl) {
    await deleteObject(result.fileUrl)
  }
})
