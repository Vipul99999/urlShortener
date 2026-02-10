import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Layout from "./components/Layout";
import ShortenForm from "./components/ShortenForm";
import StatsPage from "./components/StatsPage";
export default function App() {
    return (_jsxs(Layout, { children: [_jsxs("section", { className: "text-center mb-10", children: [_jsx("h2", { className: "text-3xl font-bold mb-2", children: "Shorten Your Links" }), _jsx("p", { className: "text-gray-600", children: "Paste a long URL below and get a short, shareable link." })] }), _jsx(ShortenForm, {}), _jsx("div", { className: "my-12", id: "stats", children: _jsx(StatsPage, {}) })] }));
}
