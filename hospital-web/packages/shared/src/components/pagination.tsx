import React from 'react'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (totalPages <= 1) return null

  // Build visible page numbers: show at most 7 pages with ellipsis
  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  const buttonBase =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      <button
        className={buttonBase}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        上一页
      </button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`e-${idx}`} className="inline-flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`${buttonBase} ${
              p === page ? 'bg-accent text-accent-foreground border-accent' : 'hover:bg-background'
            }`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className={buttonBase}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        下一页
      </button>
    </div>
  )
}
