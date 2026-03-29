import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ClipboardList, BookOpen, BarChart3, Users, Settings, } from 'lucide-react';
const navItems = [
    { to: '/', icon: LayoutDashboard, label: '工作台' },
    { to: '/hospitals', icon: Building2, label: '医院管理' },
    { to: '/tickets', icon: ClipboardList, label: '工单中心' },
    { to: '/bulletins', icon: BookOpen, label: '公告管理' },
    { to: '/reports', icon: BarChart3, label: '报表中心' },
    { to: '/users', icon: Users, label: '用户管理' },
    { to: '/settings', icon: Settings, label: '系统设置' },
];
export function Sidebar({ className = '' }) {
    return (_jsxs("aside", { className: `fixed top-0 left-0 h-screen bg-card border-r border-border flex flex-col z-30
        w-16 lg:w-[220px] ${className}`, children: [_jsx("div", { className: "h-[52px] flex items-center px-4 lg:px-5 border-b border-border", children: _jsxs("span", { className: "text-accent font-bold text-lg", children: [_jsx("span", { className: "inline", children: "\u25C6" }), _jsx("span", { className: "hidden lg:inline ml-1.5", children: "HIS" })] }) }), _jsx("nav", { className: "flex-1 py-2 overflow-y-auto", children: navItems.map((item) => (_jsxs(NavLink, { to: item.to, end: item.to === '/', className: ({ isActive }) => `flex items-center gap-3 px-4 lg:px-5 py-2.5 mx-2 rounded-lg transition-colors
              ${isActive
                        ? 'text-accent bg-accent/10 border-l-2 border-accent lg:border-l-2'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/5 border-l-2 border-transparent'}`, children: [_jsx(item.icon, { size: 20, strokeWidth: 1.5, className: "shrink-0" }), _jsx("span", { className: "hidden lg:inline text-sm", children: item.label })] }, item.to))) })] }));
}
