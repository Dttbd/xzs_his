import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../layouts/admin-layout';
import { AuthGuard } from './auth-guard';
import { LoginPage } from '../pages/login';
import { DashboardPage } from '../pages/dashboard';
function PlaceholderPage({ title }) {
    return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("p", { className: "text-muted-foreground", children: [title, " \u2014 \u5F00\u53D1\u4E2D"] }) }));
}
export const router = createBrowserRouter([
    {
        path: '/login',
        element: _jsx(LoginPage, {}),
    },
    {
        path: '/',
        element: (_jsx(AuthGuard, { children: _jsx(AdminLayout, {}) })),
        children: [
            { index: true, element: _jsx(DashboardPage, {}) },
            { path: 'hospitals', element: _jsx(PlaceholderPage, { title: "\u533B\u9662\u7BA1\u7406" }) },
            { path: 'tickets', element: _jsx(PlaceholderPage, { title: "\u5DE5\u5355\u4E2D\u5FC3" }) },
            { path: 'bulletins', element: _jsx(PlaceholderPage, { title: "\u516C\u544A\u7BA1\u7406" }) },
            { path: 'reports', element: _jsx(PlaceholderPage, { title: "\u62A5\u8868\u4E2D\u5FC3" }) },
            { path: 'users', element: _jsx(PlaceholderPage, { title: "\u7528\u6237\u7BA1\u7406" }) },
            { path: 'settings', element: _jsx(PlaceholderPage, { title: "\u7CFB\u7EDF\u8BBE\u7F6E" }) },
        ],
    },
]);
