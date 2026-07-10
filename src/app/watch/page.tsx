"use client"

import { Header } from "@/components/layout/header"
import { LiveChat } from "@/components/live/live-chat"
import { ExternalLink, Monitor, Play, Radio } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Stream {
  id: string
  race_name: string
  url: string
  embed_url: string | null
}

export default function WatchPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [activeStream, setActiveStream] = useState<Stream | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/streams")
      .then((r) => r.json())
      .then((d) => {
        const nextStreams = d.streams || []
        setStreams(nextStreams)
        if (nextStreams.length > 0) setActiveStream(nextStreams[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto w-full max-w-[1180px] px-4">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <Play className="h-5 w-5 text-[--accent]" />
                Смотреть
              </h1>
              <p className="mt-1 text-sm text-[--text-muted]">
                Активные плееры и ссылки на гоночный уикенд от администрации PADDOCK.
              </p>
            </div>
            <Link
              href="/live"
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[--bg-elevated] px-3 text-xs font-semibold text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
            >
              <Radio className="h-3.5 w-3.5 text-[--live]" />
              Live Race Center
            </Link>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] py-12 text-center text-sm text-[--text-muted]">
              Загрузка плееров...
            </div>
          ) : streams.length === 0 ? (
            <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] py-12 text-center text-[--text-muted]">
              <Monitor className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Сейчас нет активных плееров</p>
              <p className="mt-1 text-[11px]">Администратор добавит их перед сессией или гонкой.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="flex min-w-0 flex-col gap-3">
                <section className="overflow-hidden rounded-lg border border-[--border-default] bg-black">
                  {activeStream?.embed_url ? (
                    <iframe
                      src={activeStream.embed_url}
                      className="aspect-video w-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media; picture-in-picture"
                      title={activeStream.race_name}
                    />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-center">
                      <Play className="h-12 w-12 text-[--text-muted]" />
                      <div>
                        <div className="text-sm font-semibold text-white">{activeStream?.race_name}</div>
                        <div className="mt-1 text-xs text-zinc-400">Этот источник открывается во внешней вкладке.</div>
                      </div>
                      {activeStream?.url && (
                        <a
                          href={activeStream.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md bg-[--accent] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[--accent-hover]"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Открыть трансляцию
                        </a>
                      )}
                    </div>
                  )}
                </section>

                <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3">
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[--text-muted]">Плееры</h2>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {streams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => setActiveStream(stream)}
                        className={`rounded-md px-3 py-2 text-left text-xs transition-colors ${
                          activeStream?.id === stream.id
                            ? "bg-[--accent]/10 font-medium text-[--accent]"
                            : "bg-[--bg-elevated] text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Play className={`h-3 w-3 ${activeStream?.id === stream.id ? "fill-current" : ""}`} />
                          <span className="truncate">{stream.race_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="lg:sticky lg:top-20">
                <LiveChat
                  room="global"
                  title="Чат эфира"
                  subtitle="Единый с Live Race Center"
                  className="lg:h-[min(62vh,540px)]"
                  messagesClassName="max-h-[420px] lg:max-h-none"
                />
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
