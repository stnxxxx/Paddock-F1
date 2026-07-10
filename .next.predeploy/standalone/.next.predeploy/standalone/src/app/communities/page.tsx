"use client"

import { Header } from "@/components/layout/header"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiCommunity } from "@/lib/api"
import { compressImageForUpload } from "@/lib/client-image"
import { Camera, Plus, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export default function CommunitiesPage() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState<ApiCommunity[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = () => api.getCommunities().then((d) => setCommunities(d.communities || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[680px] px-4">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-[--accent]" /> Паблики</h1>
            {user && (
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> Создать</Button>
            )}
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[--text-muted]">Загрузка…</p>
          ) : communities.length === 0 ? (
            <p className="py-8 text-center text-sm text-[--text-muted]">Пока нет ни одного паблика. Создайте первый!</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {communities.map((c) => (
                <Link key={c.id} href={`/p/${c.slug}`} className="flex items-center gap-3 rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5 card-interactive">
                  <UserAvatar username={c.name} src={c.avatar} color={c.color} className="h-11 w-11 shrink-0" fallbackClassName="text-base" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[--text-primary]">{c.name}</span>
                      {c.my_role && <span className="rounded bg-[--bg-elevated] px-1.5 py-0.5 text-[10px] text-[--text-muted]">{c.my_role === "owner" ? "владелец" : "редактор"}</span>}
                    </div>
                    {c.description && <p className="mt-0.5 line-clamp-1 text-[12px] text-[--text-secondary]">{c.description}</p>}
                    <div className="mt-0.5 text-[11px] text-[--text-muted]">{c.subscriber_count ?? 0} подписчиков · {c.post_count} постов</div>
                  </div>
                  {c.is_subscribed ? <span className="text-[11px] text-[--text-muted]">вы подписаны</span> : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateModal open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  )
}

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#e10600")
  const [avatar, setAvatar] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    try {
      const compressed = await compressImageForUpload(file)
      const form = new FormData()
      form.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить")
      setAvatar(data.url)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка загрузки") }
  }

  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await api.createCommunity({ name: name.trim(), description: description.trim() || undefined, color, avatar: avatar || undefined })
      setName(""); setDescription(""); setAvatar("")
      onClose()
      toast.success("Паблик создан")
      onCreated()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось создать паблик") }
    finally { setBusy(false) }
  }

  const inputCls = "w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none focus:ring-2 focus:ring-[--accent]/25"

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      title="Создать паблик"
      description="Сообщество с предложкой, стеной и редакторами. Нужно 500 кармы."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button size="sm" onClick={submit} disabled={busy || !name.trim()}>{busy ? "..." : "Создать"}</Button>
        </>
      }
    >
      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <UserAvatar username={name || "П"} src={avatar || null} color={color} className="h-16 w-16" fallbackClassName="text-xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[--bg-surface] bg-[--accent] text-white transition-colors hover:bg-[--accent-hover]"
              title="Загрузить аватар"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f) }} />
          </div>
          <div className="min-w-0 flex-1">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={inputCls} />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[--text-muted]">
              Цвет фона:
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-5 w-7 cursor-pointer rounded border border-[--border-default] bg-transparent" />
            </p>
          </div>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2} className={`${inputCls} resize-none`} />
      </div>
    </Modal>
  )
}
