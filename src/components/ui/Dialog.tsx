import * as React from 'react'
import { cn } from '../../lib/utils'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  wide?: boolean
}) {
  React.useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    return undefined
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn('glass rounded-2xl p-6 animate-pop-in', wide ? 'max-w-4xl' : 'max-w-md', 'w-full max-h-[85vh] overflow-y-auto')}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="mb-5">
            {title && <h3 className="font-display text-lg font-semibold">{title}</h3>}
            {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>
}
