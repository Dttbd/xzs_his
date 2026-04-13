import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  BookOpen,
  BarChart3,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@hospital/shared'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '工作台' },
  { to: '/hospitals', icon: Building2, label: '医院管理' },
  { to: '/tickets', icon: ClipboardList, label: '工单中心' },
  { to: '/bulletins', icon: BookOpen, label: '公告管理' },
  { to: '/reports', icon: BarChart3, label: '报表中心' },
  { to: '/users', icon: Users, label: '用户管理' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

export const SIDEBAR_WIDTH = 220
export const SIDEBAR_COLLAPSED_WIDTH = 64

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export function Sidebar({ collapsed = false, onToggleCollapse, className = '' }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen bg-card border-r border-border flex flex-col z-30 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-[220px]',
        className,
      )}
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 border-b border-border overflow-hidden">
        <span className="text-accent font-bold text-lg whitespace-nowrap">
          <span>&#9670;</span>
          {!collapsed && <span className="ml-1.5">HIS</span>}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 py-2.5 mx-2 rounded-lg transition-colors border-l-2',
                collapsed ? 'justify-center px-0' : 'px-4',
                isActive
                  ? 'text-accent bg-accent/10 border-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/5 border-transparent',
              )
            }
          >
            <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div className="border-t border-border p-2">
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-3 w-full py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors',
              collapsed ? 'justify-center px-0' : 'px-4',
            )}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed
              ? <PanelLeftOpen size={20} strokeWidth={1.5} className="shrink-0" />
              : <PanelLeftClose size={20} strokeWidth={1.5} className="shrink-0" />}
            {!collapsed && <span className="text-sm">收起侧栏</span>}
          </button>
        </div>
      )}
    </aside>
  )
}
