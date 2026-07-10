// Shared input validation rules for auth and content endpoints.

export const LIMITS = {
  usernameMin: 3,
  usernameMax: 24,
  passwordMin: 6,
  passwordMax: 128,
  emailMax: 254,
  postTitleMax: 180,
  postContentMax: 10000,
  commentMax: 5000,
  imageUrlMax: 2048,
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[A-Za-z0-9_]+$/

export type ValidationResult = { ok: true; value: string } | { ok: false; error: string }

export function validateEmail(input: unknown): ValidationResult {
  const value = typeof input === "string" ? input.trim().toLowerCase() : ""
  if (!value) return { ok: false, error: "Email обязателен" }
  if (value.length > LIMITS.emailMax) return { ok: false, error: "Слишком длинный email" }
  if (!EMAIL_RE.test(value)) return { ok: false, error: "Некорректный email" }
  return { ok: true, value }
}

export function validateUsername(input: unknown): ValidationResult {
  const value = typeof input === "string" ? input.trim() : ""
  if (!value) return { ok: false, error: "Имя пользователя обязательно" }
  if (value.length < LIMITS.usernameMin)
    return { ok: false, error: `Имя минимум ${LIMITS.usernameMin} символа` }
  if (value.length > LIMITS.usernameMax)
    return { ok: false, error: `Имя максимум ${LIMITS.usernameMax} символа` }
  if (!USERNAME_RE.test(value))
    return { ok: false, error: "Имя может содержать только буквы, цифры и _" }
  return { ok: true, value }
}

export function validatePassword(input: unknown): ValidationResult {
  const value = typeof input === "string" ? input : ""
  if (!value) return { ok: false, error: "Пароль обязателен" }
  if (value.length < LIMITS.passwordMin)
    return { ok: false, error: `Пароль минимум ${LIMITS.passwordMin} символов` }
  if (value.length > LIMITS.passwordMax)
    return { ok: false, error: "Слишком длинный пароль" }
  return { ok: true, value }
}

// Accepts only locally-uploaded paths or absolute http(s) URLs, with a length cap.
// Rejects data:, javascript:, and other schemes that are unsafe to render as <img src>.
export function sanitizeImageUrl(input: unknown): string | null {
  if (typeof input !== "string") return null
  const value = input.trim()
  if (!value) return null
  if (value.length > LIMITS.imageUrlMax) return null
  if (value.startsWith("/uploads/")) return value
  if (/^https:\/\//i.test(value) || /^http:\/\//i.test(value)) return value
  return null
}
