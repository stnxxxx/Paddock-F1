"use client"

import { Header } from "@/components/layout/header"
import { PostCard } from "@/components/layout/post-card"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiPost } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"
import { Bookmark } from "lucide-react"

export default function BookmarksPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const d = await api.getBookmarks()
      setPosts(d.posts || [])
    } catch { /* */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) load() }, [load, user])

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center text-[--text-muted]">Войдите, чтобы видеть закладки</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-5">
        <div className="max-w-[680px] mx-auto px-4">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-5">
            <Bookmark className="w-5 h-5 text-[--gold]" /> Закладки
          </h1>
          {loading ? (
            <div className="text-center text-[--text-muted] py-8">Загрузка...</div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] py-12 text-center text-[--text-muted]">
              <Bookmark className="mx-auto mb-2 h-9 w-9 opacity-30" />
              <p className="text-sm">Нет сохранённых постов</p>
              <p className="mt-1 text-[11px]">Нажмите на иконку закладки на любом посте, чтобы сохранить</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
