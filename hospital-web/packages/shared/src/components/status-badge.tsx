import React from 'react'

export interface StatusBadgeProps {
  status: string
  label: string
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
  open:        { bg: 'bg-amber-500/10',   text: 'text-amber-500' },
  draft:       { bg: 'bg-zinc-500/10',    text: 'text-zinc-500' },
  in_progress: { bg: 'bg-blue-500/10',    text: 'text-blue-500' },
  resolved:    { bg: 'bg-emerald-500/10',  text: 'text-emerald-500' },
  suspended:   { bg: 'bg-orange-500/10',  text: 'text-orange-500' },
  closed:      { bg: 'bg-zinc-400/10',    text: 'text-zinc-400' },
  published:   { bg: 'bg-emerald-500/10',  text: 'text-emerald-500' },
  archived:    { bg: 'bg-zinc-400/10',    text: 'text-zinc-400' },
}

const defaultColor = { bg: 'bg-zinc-500/10', text: 'text-zinc-500' }

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = statusColorMap[status] ?? defaultColor

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
      {label}
    </span>
  )
}
