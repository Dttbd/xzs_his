import * as React from "react"
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { cn } from "../../lib/utils"

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function DatePicker({ value, onChange, placeholder = '选择日期', className, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDate(value)

  const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth() ?? new Date().getMonth())

  // Reset view when opening
  React.useEffect(() => {
    if (open) {
      const d = selected ?? new Date()
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [open])

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startDay = firstDay.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: Array<{ date: Date; inMonth: boolean }> = []

    // Previous month padding
    const prevDays = new Date(viewYear, viewMonth, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(viewYear, viewMonth - 1, prevDays - i), inMonth: false })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true })
    }

    // Next month padding
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(viewYear, viewMonth + 1, d), inMonth: false })
    }

    return cells
  }, [viewYear, viewMonth])

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const handleSelect = (d: Date) => {
    onChange?.(toDateStr(d))
    setOpen(false)
  }

  const todayStr = toDateStr(new Date())
  const selectedStr = value ?? ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            value ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate">{value || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={goPrev}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span className="text-sm font-medium text-foreground">
            {viewYear}年 {MONTHS[viewMonth]}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="h-8 flex items-center justify-center text-xs text-muted-foreground">
              {w}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map(({ date, inMonth }, i) => {
            const ds = toDateStr(date)
            const isSelected = ds === selectedStr
            const isToday = ds === todayStr

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(date)}
                className={cn(
                  "h-8 w-full rounded-md text-sm transition-colors",
                  !inMonth && "text-muted-foreground/30",
                  inMonth && !isSelected && "text-foreground hover:bg-accent/10",
                  isToday && !isSelected && "font-semibold text-accent",
                  isSelected && "bg-accent text-accent-foreground font-medium",
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Today shortcut */}
        <div className="mt-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => handleSelect(new Date())}
          >
            今天
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
