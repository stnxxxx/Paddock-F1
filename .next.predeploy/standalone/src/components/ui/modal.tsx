"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  /** Hide the default close (X) button in the header. */
  hideClose?: boolean
  /** Prevent closing on backdrop click / Escape (e.g. while submitting). */
  dismissible?: boolean
  className?: string
}

const SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
  hideClose = false,
  dismissible = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose()
    }
    window.addEventListener("keydown", onKey)
    // Lock background scroll while the modal is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, dismissible])

  if (!mounted) return null

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "glass-popup relative w-full overflow-hidden rounded-xl shadow-2xl",
              SIZES[size],
              className
            )}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div className="min-w-0">
                  {title && <h2 className="text-base font-semibold text-[--text-primary]">{title}</h2>}
                  {description && <p className="mt-1 text-xs text-[--text-muted]">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="-mr-1 -mt-1 rounded-md p-1.5 text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {children && <div className="px-5 pb-5 pt-4">{children}</div>}

            {footer && (
              <div className="flex justify-end gap-2 border-t border-[--border-default] px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
