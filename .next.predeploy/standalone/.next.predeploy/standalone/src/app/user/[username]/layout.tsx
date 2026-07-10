import type { Metadata } from "next"
import { getDb } from "@/db"

type Props = {
  children: React.ReactNode
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const db = getDb()
  const user = await db.get(`
    SELECT username, team, driver, bio, karma
    FROM users
    WHERE username = ?
  `, [username]) as { username: string; team: string | null; driver: string | null; bio: string | null; karma: number } | undefined

  if (!user) {
    return {
      title: "Профиль не найден",
      robots: { index: false, follow: true },
    }
  }

  const title = `${user.username} — профиль PADDOCK`
  const teamPart = user.team ? ` · ${user.team}` : ""
  const driverPart = user.driver ? ` · ${user.driver}` : ""
  const description = user.bio?.trim()
    || `Профиль ${user.username} в PADDOCK: ${user.karma} кармы${teamPart}${driverPart}.`

  return {
    title,
    description,
    alternates: { canonical: `/user/${username}` },
    openGraph: {
      title,
      description,
      type: "profile",
      images: ["/paddock-og.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/paddock-og.svg"],
    },
  }
}

export default function UserLayout({ children }: Props) {
  return children
}
