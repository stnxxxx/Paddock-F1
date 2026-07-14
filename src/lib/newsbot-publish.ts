import { getDb, type DbQuery } from "@/db"
import { NewsbotRequestError } from "@/lib/newsbot-internal"
import { v4 as uuid } from "uuid"
import { z } from "zod"

const SOURCE_SCHEMA = z.object({
  publisher: z.string().trim().min(1).max(160),
  url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), {
    message: "source URLs must use HTTPS",
  }),
  published_at: z.string().trim().max(80).nullable().optional(),
  kind: z.string().trim().min(1).max(40).default("web"),
}).strict()

const POST_SCHEMA = z.object({
  externalId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9:._-]+$/),
  contentVersion: z.number().int().min(1).max(1_000_000),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(10_000),
  classification: z.string().trim().min(1).max(40),
  category: z.string().trim().min(1).max(64),
  tags: z.array(z.string().max(64)).max(6).default([]),
  sources: z.array(SOURCE_SCHEMA).min(1).max(12),
  imageUrl: z.string().regex(/^\/uploads\/newsbot-card-[a-f0-9]{64}\.(?:png|webp)$/),
  publishAt: z.string().trim().max(80).nullable().optional(),
  correctionNote: z.string().trim().max(1000).nullable().optional(),
  metadata: z.record(z.string().max(80), z.unknown()).default({}),
}).strict()

export type NewsbotPostInput = {
  externalId: string
  contentVersion: number
  title: string
  content: string
  classification: string
  category: string
  tags: string[]
  sources: Array<{
    publisher: string
    url: string
    published_at?: string | null
    kind: string
  }>
  imageUrl: string
  publishAt: string | null
  correctionNote: string | null
  metadata: Record<string, unknown>
}

export type NewsbotPublicationResponse = {
  postId: string
  url: string
  ogImageUrl: string
  alreadyExisted: boolean
}

type PublishMode = "create" | "update"

type PublicationRow = {
  post_id: string
  content_version: number
  payload_sha256: string
  card_url: string
}

type StoredIdempotency = {
  request_hash: string
  status_code: number
  response_json: string
}

export function parseNewsbotPost(payload: unknown): NewsbotPostInput {
  const parsed = POST_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    throw new NewsbotRequestError(422, "Invalid NewsBot post payload")
  }

  serializeMetadata(parsed.data.metadata)

  return {
    ...parsed.data,
    classification: parsed.data.classification.toLowerCase(),
    category: parsed.data.category.toLowerCase(),
    tags: normalizeTags(parsed.data.tags, parsed.data.classification),
    sources: normalizeSources(parsed.data.sources),
    publishAt: parsed.data.publishAt ?? null,
    correctionNote: parsed.data.correctionNote ?? null,
  }
}

export async function publishNewsbotPost(
  input: NewsbotPostInput,
  options: { mode: PublishMode; payloadHash: string; idempotencyKey: string }
): Promise<NewsbotPublicationResponse> {
  const db = getDb()

  return db.transaction(async (tx) => {
    await tx.run("DELETE FROM newsbot_idempotency_keys WHERE expires_at < NOW()")
    const replay = await getIdempotentResponse(tx, options.idempotencyKey, options.payloadHash)
    if (replay) return replay

    const response = await writePublication(tx, input, options)
    await tx.run(
      "UPDATE newsbot_idempotency_keys SET status_code = ?, response_json = ? WHERE idempotency_key = ?",
      [200, JSON.stringify(response), options.idempotencyKey]
    )
    return response
  })
}

async function getIdempotentResponse(
  tx: DbQuery,
  key: string,
  payloadHash: string
): Promise<NewsbotPublicationResponse | null> {
  const claimed = await tx.run(
    "INSERT INTO newsbot_idempotency_keys (idempotency_key, request_hash, status_code, response_json, expires_at) VALUES (?, ?, 0, '', NOW() + INTERVAL '7 days') ON CONFLICT (key) DO NOTHING",
    [key, payloadHash]
  )
  if (claimed.rowCount === 1) return null

  const stored = await tx.get<StoredIdempotency>(
    "SELECT request_hash, status_code, response_json FROM newsbot_idempotency_keys WHERE idempotency_key = ? FOR UPDATE",
    [key]
  )
  if (!stored || stored.request_hash !== payloadHash) {
    throw new NewsbotRequestError(409, "Idempotency-Key is already used for a different request")
  }
  if (stored.status_code !== 200 || !stored.response_json) {
    throw new NewsbotRequestError(409, "Equivalent NewsBot request is still in progress")
  }

  try {
    const response = JSON.parse(stored.response_json) as NewsbotPublicationResponse
    if (
      !response ||
      typeof response.postId !== "string" ||
      typeof response.url !== "string" ||
      typeof response.ogImageUrl !== "string"
    ) {
      throw new Error("invalid cached response")
    }
    return response
  } catch {
    throw new NewsbotRequestError(500, "Stored NewsBot idempotency response is invalid")
  }
}

async function writePublication(
  tx: DbQuery,
  input: NewsbotPostInput,
  options: { mode: PublishMode; payloadHash: string }
): Promise<NewsbotPublicationResponse> {
  const author = await tx.get<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    ["news@paddock.local"]
  )
  if (!author) {
    throw new NewsbotRequestError(503, "NewsBot author is not initialized")
  }

  const communityId = resolveCommunityId(input)
  const community = await tx.get<{ id: string }>("SELECT id FROM communities WHERE id = ?", [communityId])
  if (!community) {
    throw new NewsbotRequestError(503, "NewsBot communities are not initialized")
  }

  const media = await tx.get<{ path: string }>("SELECT path FROM newsbot_media WHERE path = ?", [input.imageUrl])
  if (!media) {
    throw new NewsbotRequestError(422, "NewsBot card must be uploaded before publishing")
  }

  const metadataText = serializeMetadata(input.metadata)
  const current = await tx.get<PublicationRow>(
    "SELECT post_id, content_version, payload_sha256, card_url FROM newsbot_publications WHERE external_id = ? FOR UPDATE",
    [input.externalId]
  )

  if (!current) {
    if (options.mode === "update") {
      throw new NewsbotRequestError(404, "NewsBot publication does not exist")
    }

    const postId = uuid()
    await tx.run(
      "INSERT INTO posts (id, user_id, title, content, tag, image, community_author_id, anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [postId, author.id, input.title, input.content, input.tags[0] || null, input.imageUrl, communityId]
    )
    await replaceRelations(tx, postId, communityId, input)
    await tx.run(
      "INSERT INTO newsbot_publications (external_id, post_id, content_version, payload_sha256, classification, category, card_url, publish_at, correction_note, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.externalId,
        postId,
        input.contentVersion,
        options.payloadHash,
        input.classification,
        input.category,
        input.imageUrl,
        input.publishAt,
        input.correctionNote,
        metadataText,
      ]
    )
    return buildResponse(postId, input.imageUrl, false)
  }

  if (options.mode === "create") {
    if (current.content_version === input.contentVersion && current.payload_sha256 === options.payloadHash) {
      return buildResponse(current.post_id, current.card_url, true)
    }
    throw new NewsbotRequestError(409, "NewsBot publication already exists; use PATCH for a new version")
  }

  if (input.contentVersion < current.content_version) {
    throw new NewsbotRequestError(409, "NewsBot publication version is stale")
  }
  if (input.contentVersion === current.content_version) {
    if (current.payload_sha256 === options.payloadHash) {
      return buildResponse(current.post_id, current.card_url, true)
    }
    throw new NewsbotRequestError(409, "NewsBot publication version already has different content")
  }

  await tx.run(
    "UPDATE posts SET title = ?, content = ?, tag = ?, image = ?, community_author_id = ?, anonymous = 0, deleted = 0, updated_at = NOW() WHERE id = ?",
    [input.title, input.content, input.tags[0] || null, input.imageUrl, communityId, current.post_id]
  )
  await replaceRelations(tx, current.post_id, communityId, input)
  await tx.run(
    "UPDATE newsbot_publications SET content_version = ?, payload_sha256 = ?, classification = ?, category = ?, card_url = ?, publish_at = ?, correction_note = ?, metadata = ?, updated_at = NOW() WHERE external_id = ?",
    [
      input.contentVersion,
      options.payloadHash,
      input.classification,
      input.category,
      input.imageUrl,
      input.publishAt,
      input.correctionNote,
      metadataText,
      input.externalId,
    ]
  )

  return buildResponse(current.post_id, input.imageUrl, false)
}

async function replaceRelations(
  tx: DbQuery,
  postId: string,
  communityId: string,
  input: NewsbotPostInput
) {
  await tx.run("DELETE FROM post_tags WHERE post_id = ?", [postId])
  await tx.run("DELETE FROM community_posts WHERE post_id = ?", [postId])
  await tx.run("DELETE FROM newsbot_post_sources WHERE post_id = ?", [postId])

  for (let position = 0; position < input.tags.length; position++) {
    await tx.run(
      "INSERT INTO post_tags (post_id, tag, position) VALUES (?, ?, ?) ON CONFLICT (post_id, tag) DO NOTHING",
      [postId, input.tags[position], position]
    )
  }
  await tx.run(
    "INSERT INTO community_posts (community_id, post_id) VALUES (?, ?) ON CONFLICT (community_id, post_id) DO NOTHING",
    [communityId, postId]
  )
  for (let position = 0; position < input.sources.length; position++) {
    const source = input.sources[position]
    await tx.run(
      "INSERT INTO newsbot_post_sources (id, post_id, position, publisher, url, published_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuid(), postId, position, source.publisher, source.url, source.published_at || null, source.kind]
    )
  }
}

function serializeMetadata(metadata: Record<string, unknown>) {
  const serialized = JSON.stringify(metadata)
  if (typeof serialized !== "string" || serialized.length > 8_000) {
    throw new NewsbotRequestError(422, "NewsBot metadata is too large")
  }
  return serialized
}

function resolveCommunityId(input: NewsbotPostInput) {
  if (input.classification === "race_event") return "hub-races"
  if (input.classification === "entertainment") return "hub-memes"
  if (input.category === "technical" || input.category === "tech") return "hub-tech"
  return "hub-news"
}

function normalizeTags(input: string[], classification: string) {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const candidate of input) {
    const tag = candidate.replace(/^#+/, "").trim().slice(0, 32)
    const key = tag.toLocaleLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  if (classification.toLocaleLowerCase() === "rumor" && !seen.has("слух")) {
    tags.unshift("СЛУХ")
  }
  return tags.slice(0, 6)
}

function normalizeSources(input: NewsbotPostInput["sources"]) {
  const seen = new Set<string>()
  return input.filter((source) => {
    const key = source.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function absoluteSiteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  if (!base) return path
  try {
    return new URL(path, base).toString()
  } catch {
    return path
  }
}

function buildResponse(postId: string, cardUrl: string, alreadyExisted: boolean): NewsbotPublicationResponse {
  return {
    postId,
    url: absoluteSiteUrl("/post/" + postId),
    ogImageUrl: absoluteSiteUrl(cardUrl),
    alreadyExisted,
  }
}
