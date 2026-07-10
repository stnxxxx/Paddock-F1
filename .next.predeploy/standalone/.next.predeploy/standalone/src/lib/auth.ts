import { SignJWT, jwtVerify } from "jose"
import { cookies, headers } from "next/headers"
import { getDb } from "@/db"

export const AUTH_COOKIE = "paddock_token"
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const DEV_SECRET = "dev-only-insecure-secret-change-me"

let cachedSecret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret

  const value = process.env.JWT_SECRET
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET is missing or too short. Set a strong (>= 16 chars) JWT_SECRET in production."
      )
    }
    console.warn(
      "[auth] JWT_SECRET is not set — using an insecure development secret. Do NOT use in production."
    )
    cachedSecret = new TextEncoder().encode(DEV_SECRET)
    return cachedSecret
  }

  cachedSecret = new TextEncoder().encode(value)
  return cachedSecret
}

export interface TokenPayload {
  userId: string
  username: string
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE)
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  let token = cookieStore.get(AUTH_COOKIE)?.value
  // Native mobile clients send the JWT as a Bearer token instead of the
  // httpOnly cookie (they store it in the device keychain). Fall back to it.
  if (!token) {
    const authz = (await headers()).get("authorization")
    if (authz?.startsWith("Bearer ")) token = authz.slice(7).trim()
  }
  if (!token) return null
  return verifyToken(token)
}

export function apiResponse<T>(data: T, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}

export async function apiBanGuard(userId: string) {
  const db = getDb()
  const user = await db.get<{ banned?: number }>("SELECT banned FROM users WHERE id = ?", [userId])
  return user?.banned ? apiError("Аккаунт заблокирован", 403) : null
}

type AdminGate = { user: TokenPayload } | { error: Response }

/**
 * Server-side admin guard. Usage:
 *   const gate = await requireAdmin()
 *   if ("error" in gate) return gate.error
 *   const auth = gate.user
 */
export async function requireAdmin(): Promise<AdminGate> {
  const auth = await getAuthUser()
  if (!auth) return { error: apiError("Не авторизован", 401) }
  const db = getDb()
  const u = await db.get<{ role?: string; banned?: number }>("SELECT role, banned FROM users WHERE id = ?", [auth.userId])
  if (!u || u.role !== "admin") return { error: apiError("Только для администраторов", 403) }
  if (u.banned) return { error: apiError("Аккаунт заблокирован", 403) }
  return { user: auth }
}

/** Allows admins and moderators (content moderation, reports). */
export async function requireModerator(): Promise<AdminGate> {
  const auth = await getAuthUser()
  if (!auth) return { error: apiError("Не авторизован", 401) }
  const db = getDb()
  const u = await db.get<{ role?: string; banned?: number }>("SELECT role, banned FROM users WHERE id = ?", [auth.userId])
  if (!u || (u.role !== "admin" && u.role !== "moderator")) return { error: apiError("Только для модераторов", 403) }
  if (u.banned) return { error: apiError("Аккаунт заблокирован", 403) }
  return { user: auth }
}