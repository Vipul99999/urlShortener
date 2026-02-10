import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ResultList({ results, }) {
    if (!results.length)
        return null;
    return (_jsx("div", { className: "mt-6 space-y-3", children: results.map((r, i) => (_jsx("div", { className: "p-3 border rounded bg-gray-50 shadow-sm flex justify-between", children: _jsxs("div", { children: [_jsx("a", { href: r.shortLink, target: "_blank", rel: "noreferrer", className: "text-blue-600 hover:underline font-medium", children: r.shortLink }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Expires: ", new Date(r.expiry).toLocaleString()] })] }) }, i))) }));
}
