import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, ThemeToggle } from '@hospital/shared';
export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        }
        catch (err) {
            const message = err?.response?.data?.message ||
                err?.message ||
                '登录失败';
            setError(message);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-background flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed top-4 right-4", children: _jsx(ThemeToggle, {}) }), _jsxs("div", { className: "w-full max-w-sm bg-card border border-border rounded-xl p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-accent", children: "\u25C6 HIS" }), _jsx("p", { className: "text-muted-foreground text-sm mt-1", children: "\u533B\u9662\u4FE1\u606F\u7BA1\u7406\u7CFB\u7EDF" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "username", className: "block text-sm text-foreground mb-1.5", children: "\u7528\u6237\u540D" }), _jsx("input", { id: "username", type: "text", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u7528\u6237\u540D", required: true, className: "w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm\n                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm text-foreground mb-1.5", children: "\u5BC6\u7801" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", required: true, className: "w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm\n                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors" })] }), error && (_jsx("p", { className: "text-destructive text-sm", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium\n              hover:opacity-90 disabled:opacity-50 transition-opacity", children: loading ? '登录中...' : '登录' })] })] })] }));
}
