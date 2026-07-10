import nodemailer from "nodemailer"

let cached: nodemailer.Transporter | null | undefined

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

function getTransport(): nodemailer.Transporter | null {
  if (cached !== undefined) return cached
  if (isEmailConfigured()) {
    cached = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
  } else {
    cached = null
  }
  return cached
}

/**
 * Sends an email via Gmail SMTP when GMAIL_USER/GMAIL_APP_PASSWORD are set.
 * Otherwise (dev / not configured) it logs the message to the server console so
 * flows remain testable without real mail delivery.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const transport = getTransport()
  if (!transport) {
    console.log(`\n──── [email:dev] ────\nTo: ${to}\nSubject: ${subject}\n${text}\n─────────────────────\n`)
    return
  }
  const from = process.env.GMAIL_FROM || process.env.GMAIL_USER
  await transport.sendMail({ from: `PADDOCK <${from}>`, to, subject, text })
}
