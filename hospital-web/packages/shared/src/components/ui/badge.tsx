import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent/10 text-accent",
        pending: "bg-[var(--status-pending)]/10 text-[var(--status-pending)]",
        progress: "bg-[var(--status-progress)]/10 text-[var(--status-progress)]",
        resolved: "bg-[var(--status-resolved)]/10 text-[var(--status-resolved)]",
        suspended: "bg-[var(--status-suspended)]/10 text-[var(--status-suspended)]",
        closed: "bg-[var(--status-closed)]/10 text-[var(--status-closed)]",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        secondary: "bg-card border border-border text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
