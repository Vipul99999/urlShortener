import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Header() {
    return (_jsx("header", { className: "bg-white shadow", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center", children: [_jsx("h1", { className: "text-xl font-bold text-blue-600", children: "URL Shortener" }), _jsxs("nav", { className: "space-x-4", children: [_jsx("a", { href: "/", className: "text-gray-700 hover:text-blue-600 hover:font-bold", children: "Home" }), _jsx("a", { href: "#stats", className: "text-gray-700 hover:text-blue-600 hover:font-bold", children: "Stats" })] })] }) }));
}
