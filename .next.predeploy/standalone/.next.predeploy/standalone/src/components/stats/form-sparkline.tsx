/**
 * Recent form: the last N finishing positions, newest on the right.
 * 0 marks a DNF. Colour encodes result quality so a row of results reads at a
 * glance — this replaces the old "points relative to leader" bar, which wasn't
 * form at all.
 */
function cell(pos: number): { bg: string; fg: string; label: string } {
  if (pos === 0) return { bg: "var(--color-destructive)", fg: "#fff", label: "—" }
  if (pos === 1) return { bg: "var(--color-gold)", fg: "#1a1a1a", label: "1" }
  if (pos <= 3) return { bg: "var(--color-teal)", fg: "#fff", label: String(pos) }
  if (pos <= 10) return { bg: "color-mix(in srgb, var(--color-live) 22%, transparent)", fg: "var(--color-text-primary)", label: String(pos) }
  return { bg: "var(--color-bg-elevated)", fg: "var(--color-text-muted)", label: String(pos) }
}

export function FormSparkline({ form }: { form: number[] }) {
  if (!form.length) {
    return <span className="text-[10px] text-[--text-muted]">—</span>
  }
  return (
    <div className="flex items-center gap-0.5">
      {form.map((pos, i) => {
        const { bg, fg, label } = cell(pos)
        return (
          <span
            key={i}
            title={pos === 0 ? "Сход (DNF)" : `P${pos}`}
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-0.5 text-[9px] font-bold tabular-nums"
            style={{ backgroundColor: bg, color: fg }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
