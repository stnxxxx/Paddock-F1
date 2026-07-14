import type { Metadata } from "next"
import { getDb } from "@/db"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

function excerpt(text: string | null | undefined, fallback: string) {
  const clean = (text || "").replace(/\s+/g, " ").trim()
  if (!clean) return fallback
  return clean.length > 155 ? clean.slice(0, 152) + "..." : clean
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const db = getDb()
  const post = await db.get(`
    SELECT p.title, p.content, p.tag, p.image, p.created_at, u.username
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND p.deleted = 0
  `, [id]) as {
    title: string
    content: string | null
    tag: string | null
    image: string | null
    created_at: string
    username: string
  } | undefined

  if (!post) {
    return {
      title: "Пост не найден",
      robots: { index: false, follow: true },
    }
  }

  const title = post.tag ? post.title + " — " + post.tag : post.title
  const description = excerpt(post.content, "Пост " + post.username + " в PADDOCK — русскоязычном F1-комьюнити.")
  const card = post.image?.startsWith("/uploads/newsbot-card-") ? post.image : "/paddock-og.svg"

  return {
    title,
    description,
    alternates: { canonical: "/post/" + id },
    openGraph: {
      title,
      description,
      type: "article",
      url: "/post/" + id,
      publishedTime: post.created_at,
      images: [{ url: card, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [card],
    },
  }
}

export default function PostLayout({ children }: Props) {
  return children
}
