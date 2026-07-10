"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="font-display text-[13px] font-black tracking-[0.18em] text-[--text-muted]">PADDOCK</span>
      <h1 className="mt-6 text-xl font-semibold text-[--text-primary]">Что-то пошло не так</h1>
      <p className="mt-1.5 max-w-sm text-sm text-[--text-secondary]">
        Произошла непредвиденная ошибка. Попробуйте обновить страницу — если повторяется, вернитесь позже.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-[--text-muted]">код: {error.digest}</p>
      )}
      <div className="mt-6 flex items-center gap-2.5">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-lg bg-[--accent] px-5 text-sm font-bold text-white transition-colors hover:bg-[--accent-hover]"
        >
          Попробовать снова
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg border border-[--border-default] px-5 text-sm font-semibold text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
        >
          На главную
        </Link>
      </div>
    </main>
  )
}
