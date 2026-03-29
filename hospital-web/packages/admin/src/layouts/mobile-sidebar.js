import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, Building2, ClipboardList, BookOpen, BarChart3, Users, Settings, } from 'lucide-react';
const navItems = [
    { to: '/', icon: LayoutDashboard, label: '工作台' },
    { to: '/hospitals', icon: Building2, label: '医院管理' },
    { to: '/tickets', icon: ClipboardList, label: '工单中心' },
    { to: '/bulletins', icon: BookOpen, label: '公告管理' },
    { to: '/reports', icon: BarChart3, label: '报表中心' },
    { to: '/users', icon: Users, label: '用户管理' },
    { to: '/settings', icon: Settings, label: '系统设置' },
];
export function MobileSidebar({ open, onClose }) {
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 md:hidden", children: [_jsx("div", { className: "absolute inset-0 bg-black/40", onClick: onClose }), _jsxs("aside", { className: "absolute top-0 left-0 h-full w-[260px] bg-card border-r border-border flex flex-col", children: [_jsxs("div", { className: "h-[52px] flex items-center justify-between px-5 border-b border-border", children: [_jsx("span", { className: "text-accent font-bold text-lg", children: "\u25C6 HIS" }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors", "aria-label": "\u5173\u95ED\u83DC\u5355", children: _jsx(X, { size: 20, strokeWidth: 1.5 }) })] }), _jsx("nav", { className: "flex-1 py-2 overflow-y-auto", children: navItems.map((item) => (_jsxs(NavLink, { to: item.to, end: item.to === '/', onClick: onClose, className: ({ isActive }) => `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg transition-colors
                ${isActive
                                ? 'text-accent bg-accent/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'}`, children: [_jsx(item.icon, { size: 20, strokeWidth: 1.5, className: "shrink-0" }), _jsx("span", { className: "text-sm", children: item.label })] }, item.to))) })] })] }));
}
