import React from 'react'

export interface LoadingProps {
  className?: string
}

export function Loading({ className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  )
}
