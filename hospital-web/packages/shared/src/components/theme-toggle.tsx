import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeContext } from './theme-provider'
import { Button } from './ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext()

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={`Theme: ${theme}`}
    >
      <Icon size={18} strokeWidth={1.5} />
    </Button>
  )
}
