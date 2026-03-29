import { NavLink } from 'react-router-dom'
import { X,
  LayoutDashboard,
  Building2,
  ClipboardList,
  BookOpen,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '工作台' },
  { to: '/hospitals', icon: Building2, label: '医院管理' },
  { to: '/tickets', icon: ClipboardList, label: '工单中心' },
  { to: '/bulletins', icon: BookOpen, label: '公告管理' },
  { to: '/reports', icon: BarChart3, label: '报表中心' },
  { to: '/users', icon: Users, label: '用户管理' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="absolute top-0 left-0 h-full w-[260px] bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="h-[52px] flex items-center justify-between px-5 border-b border-border">
          <span className="text-accent font-bold text-lg">&#9670; HIS</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
            aria-label="关闭菜单"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg transition-colors
                ${
                  isActive
                    ? 'text-accent bg-accent/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                }`
              }
            >
              <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}
