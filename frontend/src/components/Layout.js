import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Header from "./Header";
import Footer from "./Footer";
export default function Layout({ children }) {
    return (_jsxs("div", { className: "flex flex-col min-h-screen bg-gray-50 text-gray-900", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8", children: children }), _jsx(Footer, {})] }));
}
