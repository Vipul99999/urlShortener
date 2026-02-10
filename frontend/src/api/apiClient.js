const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
export async function postShorturl(payload) {
    const res = await fetch(`${BASE}/shorturls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok)
        throw data;
    return data;
}
export async function getStats(shortcode) {
    const res = await fetch(`${BASE}/shorturls/${encodeURIComponent(shortcode)}`);
    const data = await res.json();
    if (!res.ok)
        throw data;
    return data;
}
