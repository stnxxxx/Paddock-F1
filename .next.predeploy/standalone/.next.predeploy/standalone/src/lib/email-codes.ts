import { type DbQuery } from "@/db"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { sendMail } from "./email"

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export type CodePurpose = "register" | "login" | "reset"

const PURPOSE_LABEL: Record<CodePurpose, string> = {
  register: "регистрации",
  login: "входа",
  reset: "сброса пароля",
}

function generateCode(): string {
  // Cryptographically secure: these codes are an auth factor (passwordless
  // login + password reset), so a predictable PRNG (Math.random) is unsafe.
  return String(crypto.randomInt(100000, 1000000))
}

/** Generates a 6-digit code, stores its hash (one active code per email+purpose), and emails it. Returns the code (caller may surface it only in dev). */
export async function createAndSendCode(db: DbQuery, email: string, purpose: CodePurpose): Promise<string> {
  const code = generateCode()
  const hash = bcrypt.hashSync(code, 8)
  const expires = new Date(Date.now() + CODE_TTL_MS).toISOString()
  await db.run(`
    INSERT INTO email_codes (email, purpose, code_hash, expires_at, attempts, created_at)
    VALUES (?, ?, ?, ?, 0, NOW())
    ON CONFLICT (email, purpose) DO UPDATE SET
      code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()
  `, [email, purpose, hash, expires])

  await sendMail(
    email,
    "PADDOCK — код подтверждения",
    `Ваш код для ${PURPOSE_LABEL[purpose]}: ${code}\n\nКод действует 10 минут. Если вы не запрашивали его — просто проигнорируйте это письмо.`
  )
  return code
}

interface CodeRow {
  code_hash: string
  expires_at: string
  attempts: number
}

/** Verifies a code and consumes it on success (or on terminal failure). */
export async function verifyAndConsumeCode(db: DbQuery, email: string, purpose: CodePurpose, code: string): Promise<{ ok: boolean; error?: string }> {
  const clear = () => db.run("DELETE FROM email_codes WHERE email = ? AND purpose = ?", [email, purpose])
  const row = await db.get<CodeRow>("SELECT code_hash, expires_at, attempts FROM email_codes WHERE email = ? AND purpose = ?", [email, purpose])

  if (!row) return { ok: false, error: "Код не запрашивался или уже использован" }
  if (Date.parse(row.expires_at) < Date.now()) { await clear(); return { ok: false, error: "Код истёк — запросите новый" } }
  if (row.attempts >= MAX_ATTEMPTS) { await clear(); return { ok: false, error: "Слишком много попыток — запросите новый код" } }
  if (!bcrypt.compareSync(String(code || ""), row.code_hash)) {
    await db.run("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ? AND purpose = ?", [email, purpose])
    return { ok: false, error: "Неверный код" }
  }
  await clear()
  return { ok: true }
}