import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'his-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  useEffect(() => {
    applyTheme(theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') applyTheme('system')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  return { theme, setTheme, resolvedTheme }
}
