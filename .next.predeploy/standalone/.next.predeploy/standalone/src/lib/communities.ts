import { type DbQuery } from "@/db"
import { v4 as uuid } from "uuid"

export interface CommunityRow {
  id: string
  slug: string
  name: string
  created_by: string
}

/** Translit + slugify a community name into a URL-safe slug. */
export function slugify(name: string): string {
  const translit: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  }
  return name
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function getCommunityBySlug(db: DbQuery, slug: string): Promise<CommunityRow | undefined> {
  return db.get<CommunityRow>("SELECT id, slug, name, created_by FROM communities WHERE slug = ?", [slug])
}

export type CommunityRole = "owner" | "editor" | null

/**
 * Returns the user's effective role within a community.
 * Site admins and the community owner get "owner"; community moderators get "editor".
 * Editors (and owners) may post to the wall and moderate the suggestion queue.
 */
export async function getCommunityRole(
  db: DbQuery,
  communityId: string,
  ownerId: string,
  userId: string | undefined,
  siteRole?: string
): Promise<CommunityRole> {
  if (!userId) return null
  if (siteRole === "admin" || ownerId === userId) return "owner"
  const mod = await db.get("SELECT 1 FROM community_moderators WHERE community_id = ? AND user_id = ?", [communityId, userId])
  return mod ? "editor" : null
}

export function canModerate(role: CommunityRole): boolean {
  return role === "owner" || role === "editor"
}

export function normalizeTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : []
  const seen = new Set<string>()
  return raw
    .map((tag) => String(tag).replace(/^#+/, "").trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 32))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

export interface WallPostInput {
  communityId: string
  authorId: string
  title: string
  content: string
  image: string | null
  tags: string[]
  /** true → post appears as the community; false → credited to the author. */
  asCommunity: boolean
  /** true → hide the author credit ("от {user}"); the post still appears as the community. */
  anonymous?: boolean
}

/** Creates a post on a community's wall (and links it). Returns the new post id. */
export async function publishToWall(db: DbQuery, opts: WallPostInput): Promise<string> {
  const id = uuid()
  const anon = opts.anonymous ? 1 : 0
  await db.transaction(async (db) => {
    await db.run(
      "INSERT INTO posts (id, user_id, title, content, tag, image, community_author_id, anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, opts.authorId, opts.title, opts.content, opts.tags[0] || null, opts.image || null, opts.asCommunity ? opts.communityId : null, anon]
    )
    for (let i = 0; i < opts.tags.length; i++) {
      await db.run(
        "INSERT INTO post_tags (post_id, tag, position) VALUES (?, ?, ?) ON CONFLICT (post_id, tag) DO NOTHING",
        [id, opts.tags[i], i]
      )
    }
    await db.run(
      "INSERT INTO community_posts (community_id, post_id) VALUES (?, ?) ON CONFLICT (community_id, post_id) DO NOTHING",
      [opts.communityId, id]
    )
  })
  return id
}