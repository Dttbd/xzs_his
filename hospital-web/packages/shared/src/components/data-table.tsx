import React from 'react'

export interface Column<T> {
  key: string
  title: string
  render?: (value: any, record: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (record: T) => void
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        {emptyText}
      </div>
    )
  }

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground ${col.className ?? ''}`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((record, rowIdx) => (
              <tr
                key={(record as any).id ?? rowIdx}
                className={`border-t border-border transition-colors hover:bg-background ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(record)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(record[col.key], record)
                      : (record[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.map((record, rowIdx) => (
          <div
            key={(record as any).id ?? rowIdx}
            className={`rounded-xl border border-border bg-card p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick?.(record)}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-baseline justify-between py-1.5">
                <span className="text-xs font-medium text-muted-foreground">{col.title}</span>
                <span className="text-sm text-right ml-4">
                  {col.render
                    ? col.render(record[col.key], record)
                    : (record[col.key] ?? '-')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
