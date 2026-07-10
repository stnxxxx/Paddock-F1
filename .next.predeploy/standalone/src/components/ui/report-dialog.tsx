"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const REPORT_REASONS = [
  { value: "spam", label: "Спам или реклама" },
  { value: "abuse", label: "Оскорбления или травля" },
  { value: "spoiler", label: "Спойлер без предупреждения" },
  { value: "misinformation", label: "Ложная информация" },
  { value: "other", label: "Другое" },
]

interface Props {
  open: boolean
  onClose: () => void
  postId?: string
  commentId?: string
  userId?: string
  contextText?: string
}

export function ReportDialog({ open, onClose, postId, commentId, userId, contextText }: Props) {
  const [reason, setReason] = useState("spam")
  const [details, setDetails] = useState("")
  const [busy, setBusy] = useState(false)
  const isComment = Boolean(commentId)
  const isUser = Boolean(userId && !postId && !commentId)
  const hasTarget = Boolean(postId || commentId || userId)

  useEffect(() => {
    if (!open) return
    setReason("spam")
    setDetails("")
  }, [open, postId, commentId, userId])

  const submit = async () => {
    if (busy) return
    if (!hasTarget) {
      toast.error("Не выбрана цель жалобы")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, commentId, userId, reason, details: details.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Не удалось отправить жалобу")
      toast.success("Жалоба отправлена модераторам")
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить жалобу")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      title={isUser ? "Пожаловаться на пользователя" : isComment ? "Пожаловаться на комментарий" : "Пожаловаться на пост"}
      description="Модераторы увидят причину, контекст и смогут быстро принять меры."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={busy || !hasTarget}
            className="text-white hover:brightness-110"
            style={{ backgroundColor: "var(--color-destructive)" }}
          >
            {busy ? "Отправка..." : "Отправить"}
          </Button>
        </>
      }
    >
      {contextText && (
        <div className="mb-3 line-clamp-3 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-xs text-[--text-secondary]">
          {contextText}
        </div>
      )}
      <div className="space-y-2">
        {REPORT_REASONS.map((item) => {
          const selected = reason === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setReason(item.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                selected ? "text-[--text-primary]" : "border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]"
              )}
              style={selected ? {
                borderColor: "var(--color-destructive)",
                backgroundColor: "color-mix(in srgb, var(--color-destructive) 14%, transparent)",
              } : undefined}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value.slice(0, 500))}
        placeholder="Дополнительные детали, если нужно"
        rows={3}
        className="mt-3 w-full resize-none rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] transition-[border-color,box-shadow] focus:border-[--accent] focus:outline-none focus:ring-2 focus:ring-[--accent]/25"
      />
    </Modal>
  )
}
