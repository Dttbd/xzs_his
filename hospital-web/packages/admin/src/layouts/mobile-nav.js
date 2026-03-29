import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ClipboardList, BookOpen, User, } from 'lucide-react';
const tabs = [
    { to: '/', icon: LayoutDashboard, label: '工作台' },
    { to: '/hospitals', icon: Building2, label: '医院' },
    { to: '/tickets', icon: ClipboardList, label: '工单' },
    { to: '/bulletins', icon: BookOpen, label: '公告' },
    { to: '/settings', icon: User, label: '我的' },
];
export function MobileNav({ className = '' }) {
    return (_jsx("nav", { className: `fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 ${className}`, children: _jsx("div", { className: "flex items-center justify-around h-14", children: tabs.map((tab) => (_jsxs(NavLink, { to: tab.to, end: tab.to === '/', className: ({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 transition-colors
              ${isActive ? 'text-accent' : 'text-muted-foreground'}`, children: [_jsx(tab.icon, { size: 20, strokeWidth: 1.5 }), _jsx("span", { className: "text-[10px]", children: tab.label })] }, tab.to))) }) }));
}
