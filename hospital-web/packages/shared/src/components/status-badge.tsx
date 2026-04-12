import { Badge, type BadgeProps } from './ui/badge'

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  open: 'pending',
  pending: 'pending',
  in_progress: 'progress',
  resolved: 'resolved',
  suspended: 'suspended',
  closed: 'closed',
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
}

export interface StatusBadgeProps {
  status: string
  label: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || 'outline'
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
