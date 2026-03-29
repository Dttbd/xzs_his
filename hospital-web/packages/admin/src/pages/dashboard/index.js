import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useAuthStore } from '@hospital/shared';
export function DashboardPage() {
    const user = useAuthStore((s) => s.user);
    return (_jsxs("div", { children: [_jsxs("h1", { className: "text-xl font-semibold text-foreground", children: ["\u6B22\u8FCE\u56DE\u6765\uFF0C", user?.real_name || '管理员'] }), _jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: "\u5DE5\u4F5C\u53F0 \u2014 \u4EEA\u8868\u76D8\u529F\u80FD\u5F00\u53D1\u4E2D" })] }));
}
