import { ThemeProvider, ThemeToggle } from '@hospital/shared'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">HIS 管理系统</h1>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  )
}

export default App
