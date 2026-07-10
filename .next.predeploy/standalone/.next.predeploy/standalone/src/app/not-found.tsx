import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="font-display text-[13px] font-black tracking-[0.18em] text-[--text-muted]">PADDOCK</span>
      <p className="mt-6 font-display text-[64px] font-black leading-none text-[--text-primary]">404</p>
      <h1 className="mt-3 text-lg font-semibold text-[--text-primary]">Страница не найдена</h1>
      <p className="mt-1.5 max-w-sm text-sm text-[--text-secondary]">
        Похоже, эта трасса не входит в календарь. Проверьте адрес или вернитесь на главную.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[--accent] px-5 text-sm font-bold text-white transition-colors hover:bg-[--accent-hover]"
      >
        На главную
      </Link>
    </main>
  )
}
