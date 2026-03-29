import React, { useEffect, useRef } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  message = '确定要执行此操作吗？此操作不可撤销。',
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-none">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground transition-colors hover:bg-destructive/90"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
