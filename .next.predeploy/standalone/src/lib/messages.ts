import { type DbQuery } from "@/db"

/** DMs are only allowed between users who follow each other. */
export async function isMutualFollow(db: DbQuery, a: string, b: string): Promise<boolean> {
  if (a === b) return false
  const aFollowsB = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?", [a, b])
  const bFollowsA = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?", [b, a])
  return !!aFollowsB && !!bFollowsA
}