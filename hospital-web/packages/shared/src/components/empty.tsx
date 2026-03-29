import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyProps {
  message?: string
}

export function Empty({ message = '暂无数据' }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Inbox className="h-10 w-10" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
