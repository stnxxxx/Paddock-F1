"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, ApiCommunity } from "@/lib/api"
import { LIMITS } from "@/lib/validation"
import { compressImageForUpload } from "@/lib/client-image"
import { Image as ImageIcon, Megaphone, PenLine, Plus, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export function HeaderCreate({ onNewPost }: { onNewPost?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [communityModal, setCommunityModal] = useState(false)

  const newPost = () => {
    setOpen(false)
    if (onNewPost) onNewPost()
    else router.push("/?compose=1")
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-[--accent] px-2.5 text-xs font-bold text-white shadow-[0_10px_22px_-16px_rgba(0,0,0,0.7)] transition-colors hover:bg-[--accent-hover] active:translate-y-px sm:px-3.5"
          title="Создать"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Создать</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="glass-popup absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-lg p-1 shadow-2xl">
              <button onClick={newPost} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[--bg-hover]">
                <PenLine className="h-4 w-4 text-[--text-secondary]" />
                <span>
                  <span className="block text-sm font-medium text-[--text-primary]">Новый пост</span>
                  <span className="block text-[11px] text-[--text-muted]">В общую ленту</span>
                </span>
              </button>
              <button onClick={() => { setOpen(false); setCommunityModal(true) }} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[--bg-hover]">
                <Megaphone className="h-4 w-4 text-[--accent]" />
                <span>
                  <span className="block text-sm font-medium text-[--text-primary]">От имени паблика</span>
                  <span className="block text-[11px] text-[--text-muted]">На стену сообщества</span>
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <CommunityPostModal open={communityModal} onClose={() => setCommunityModal(false)} />
    </>
  )
}

function CommunityPostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [managed, setManaged] = useState<ApiCommunity[]>([])
  const [loaded, setLoaded] = useState(false)
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [image, setImage] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoaded(false)
    setTitle(""); setContent(""); setImage("")
    api.getCommunities().then((d) => {
      const mine = (d.communities || []).filter((c) => c.my_role === "owner" || c.my_role === "editor")
      setManaged(mine)
      setSlug(mine[0]?.slug || "")
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [open])

  const uploadImage = async (file: File) => {
    try {
      const compressed = await compressImageForUpload(file)
      const form = new FormData()
      form.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить")
      setImage(data.url)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка загрузки") }
  }

  const submit = async () => {
    if (!slug || !title.trim() || busy) return
    if (title.length > LIMITS.postTitleMax) { toast.error(`Заголовок короче ${LIMITS.postTitleMax} символов`); return }
    setBusy(true)
    try {
      await api.submitToCommunity(slug, { title: title.trim(), content: content.trim(), image: image || undefined, asCommunity: true })
      toast.success("Опубликовано на стене паблика")
      setTitle(""); setContent(""); setImage("")
      onClose()
      router.push(`/p/${slug}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось опубликовать") }
    finally { setBusy(false) }
  }

  const inputCls = "w-full rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none focus:ring-2 focus:ring-[--accent]/25"

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      title="Пост от имени паблика"
      description="Публикация появится на стене сообщества от его имени."
      footer={managed.length > 0 ? (
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>{busy ? "..." : "Опубликовать"}</Button>
        </>
      ) : undefined}
    >
      {!loaded ? (
        <p className="py-4 text-center text-sm text-[--text-muted]">Загрузка…</p>
      ) : managed.length === 0 ? (
        <div className="py-2 text-center">
          <p className="text-sm text-[--text-secondary]">Вы не управляете ни одним пабликом.</p>
          <Link href="/communities" onClick={onClose} className="mt-2 inline-block text-xs font-medium text-[--accent] hover:underline">Создать паблик →</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger className="w-full border-[--border-default] bg-[--bg-elevated] text-[13px]">
              <SelectValue placeholder="Выберите паблик" />
            </SelectTrigger>
            <SelectContent>
              {managed.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" className={inputCls} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Текст. Поддерживается **жирный**, *курсив*, `код`." rows={4} className={`${inputCls} resize-none`} />
          {image && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="max-h-40 rounded-md border border-[--border-default]" />
              <button onClick={() => setImage("")} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white" aria-label="Убрать изображение"><X className="h-3 w-3" /></button>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-[--border-default] px-3 py-1.5 text-xs text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
          >
            <ImageIcon className="h-3.5 w-3.5" /> {image ? "Заменить изображение" : "Прикрепить изображение"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f) }} />
        </div>
      )}
    </Modal>
  )
}
