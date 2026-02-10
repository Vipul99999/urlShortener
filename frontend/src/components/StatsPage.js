import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { getStats } from "../api/apiClient";
export default function StatsPage() {
    const [code, setCode] = useState("");
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    async function fetchStats() {
        setError(null);
        try {
            const data = await getStats(code);
            setStats(data);
        }
        catch (err) {
            setError(err?.error || "Stats not found");
            setStats(null);
        }
    }
    return (_jsxs("div", { className: "bg-white p-6 rounded shadow", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Link Statistics" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 mb-4", children: [_jsx("input", { type: "text", placeholder: "Enter shortcode", value: code, onChange: (e) => setCode(e.target.value), className: "flex-1 border rounded px-3 py-2" }), _jsx("button", { onClick: fetchStats, className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded", children: "Fetch" })] }), error && _jsx("p", { className: "text-red-600", children: error }), stats && (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("strong", { children: "Original URL:" }), " ", stats.originalUrl] }), _jsxs("p", { children: [_jsx("strong", { children: "Clicks:" }), " ", stats.clicksCount] }), _jsx("ul", { className: "list-disc ml-6 text-sm text-gray-700", children: stats.clicks.map((c, i) => (_jsxs("li", { children: [new Date(c.timestamp).toLocaleString(), " \u2014", " ", c.referrer || "—", " \u2014 ", c.country || "—"] }, i))) })] }))] }));
}
