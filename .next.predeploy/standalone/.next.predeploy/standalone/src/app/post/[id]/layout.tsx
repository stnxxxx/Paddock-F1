import type { Metadata } from "next"
import { getDb } from "@/db"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

function excerpt(text: string | null | undefined, fallback: string) {
  const clean = (text || "").replace(/\s+/g, " ").trim()
  if (!clean) return fallback
  return clean.length > 155 ? `${clean.slice(0, 152)}...` : clean
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const db = getDb()
  const post = await db.get(`
    SELECT p.title, p.content, p.tag, u.username
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND p.deleted = 0
  `, [id]) as { title: string; content: string | null; tag: string | null; username: string } | undefined

  if (!post) {
    return {
      title: "Пост не найден",
      robots: { index: false, follow: true },
    }
  }

  const title = post.tag ? `${post.title} — ${post.tag}` : post.title
  const description = excerpt(post.content, `Пост ${post.username} в PADDOCK — русскоязычном F1-комьюнити.`)

  return {
    title,
    description,
    alternates: { canonical: `/post/${id}` },
    openGraph: {
      title,
      description,
      type: "article",
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

export default function PostLayout({ children }: Props) {
  return children
}
