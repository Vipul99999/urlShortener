import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

type StorageProvider = 'local' | 'r2'

type ObjectStorageDescriptor = {
  provider: StorageProvider
  key: string
  location: string
}

function storageProvider(): StorageProvider {
  return process.env.OBJECT_STORAGE_PROVIDER === 'r2' ? 'r2' : 'local'
}

function storageRoot() {
  return process.env.EXPORT_STORAGE_DIR || path.join(process.cwd(), '.data', 'exports')
}

function resolveStoragePath(key: string) {
  const safeKey = normalizeKey(key)
  return path.join(storageRoot(), safeKey)
}

function normalizeKey(key: string) {
  return key.replace(/\\/g, '/').replace(/^\/+/, '')
}

function ensureR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 storage is not fully configured')
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint:
      process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || null
  }
}

let r2Client: S3Client | null = null

function getR2Client() {
  if (r2Client) return r2Client

  const config = ensureR2Config()
  r2Client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  })

  return r2Client
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof Uint8Array) return Buffer.from(body)
  if (body instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  if (body && typeof body === 'object' && 'transformToByteArray' in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
    return Buffer.from(bytes)
  }

  throw new Error('Unsupported object storage body type')
}

async function writeLocalObject(key: string, content: string | Buffer) {
  const filePath = resolveStoragePath(key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
  return {
    provider: 'local',
    key,
    location: filePath
  } satisfies ObjectStorageDescriptor
}

async function readLocalObject(key: string) {
  const filePath = resolveStoragePath(key)
  return fs.readFile(filePath)
}

async function deleteLocalObject(key: string) {
  const filePath = resolveStoragePath(key)
  await fs.rm(filePath, { force: true })
}

async function writeR2Object(key: string, content: string | Buffer, contentType?: string) {
  const config = ensureR2Config()
  const client = getR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: content,
      ContentType: contentType
    })
  )

  return {
    provider: 'r2',
    key,
    location: config.publicBaseUrl
      ? `${config.publicBaseUrl.replace(/\/+$/, '')}/${key}`
      : key
  } satisfies ObjectStorageDescriptor
}

async function readR2Object(key: string) {
  const config = ensureR2Config()
  const client = getR2Client()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )

  return bodyToBuffer(response.Body ?? '')
}

async function deleteR2Object(key: string) {
  const config = ensureR2Config()
  const client = getR2Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )
}

export async function writeObject(
  key: string,
  content: string | Buffer,
  options?: {
    contentType?: string
  }
) {
  const normalizedKey = normalizeKey(key)

  if (storageProvider() === 'r2') {
    return writeR2Object(normalizedKey, content, options?.contentType)
  }

  return writeLocalObject(normalizedKey, content)
}

export async function readObject(key: string) {
  const normalizedKey = normalizeKey(key)

  if (storageProvider() === 'r2') {
    return readR2Object(normalizedKey)
  }

  return readLocalObject(normalizedKey)
}

export async function deleteObject(key: string) {
  const normalizedKey = normalizeKey(key)

  if (storageProvider() === 'r2') {
    await deleteR2Object(normalizedKey)
    return
  }

  await deleteLocalObject(normalizedKey)
}

export function objectPublicPath(key: string) {
  return normalizeKey(key)
}

export function describeObjectStorage() {
  if (storageProvider() === 'r2') {
    const config = ensureR2Config()
    return {
      provider: 'r2' as const,
      bucket: config.bucket,
      endpoint: config.endpoint
    }
  }

  return {
    provider: 'local' as const,
    root: storageRoot()
  }
}
