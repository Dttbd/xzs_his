import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';
import { MobileSidebar } from './mobile-sidebar';
export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "min-h-screen bg-background", children: [_jsx(Sidebar, { className: "hidden md:flex" }), _jsx(MobileSidebar, { open: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsxs("div", { className: "md:ml-16 lg:ml-[220px] flex flex-col min-h-screen", children: [_jsx(Topbar, { onMenuClick: () => setSidebarOpen(true) }), _jsx("main", { className: "flex-1 p-4 lg:p-6 pb-20 md:pb-6", children: _jsx(Outlet, {}) })] }), _jsx(MobileNav, { className: "md:hidden" })] }));
}
