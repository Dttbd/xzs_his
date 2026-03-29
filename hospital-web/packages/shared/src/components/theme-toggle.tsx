import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeContext } from './theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext()

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg border border-border text-muted hover:text-foreground transition-colors"
      title={`Theme: ${theme}`}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  )
}
