"use client"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  /** Visual size. `sm` matches inline form controls; `md` (default) suits settings rows. */
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/** A pill toggle switch — the standard on/off control across the site (replaces native checkboxes). */
export function Switch({ checked, onChange, disabled = false, size = "md", className, ...rest }: SwitchProps) {
  const dims =
    size === "sm"
      ? { track: "h-[18px] w-8", knob: "h-3.5 w-3.5", on: "translate-x-[15px]", off: "translate-x-[3px]" }
      : { track: "h-5 w-9", knob: "h-4 w-4", on: "translate-x-[18px]", off: "translate-x-[3px]" }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40 disabled:cursor-not-allowed disabled:opacity-50",
        dims.track,
        className
      )}
      style={{ backgroundColor: checked ? "var(--accent)" : "var(--color-bg-active)" }}
      {...rest}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-sm transition-transform",
          dims.knob,
          checked ? dims.on : dims.off
        )}
      />
    </button>
  )
}
