import React, { useState } from "react";
import { getStats } from "../api/apiClient";

export default function StatsPage() {
  const [code, setCode] = useState("");
  const [stats, setStats] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setError(null);
    try {
      const data = await getStats(code);
      setStats(data);
    } catch (err: any) {
      setError(err?.error || "Stats not found");
      setStats(null);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Link Statistics</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter shortcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={fetchStats}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Fetch
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {stats && (
        <div className="space-y-2">
          <p>
            <strong>Original URL:</strong> {stats.originalUrl}
          </p>
          <p>
            <strong>Clicks:</strong> {stats.clicksCount}
          </p>
          <ul className="list-disc ml-6 text-sm text-gray-700">
            {stats.clicks.map((c: any, i: number) => (
              <li key={i}>
                {new Date(c.timestamp).toLocaleString()} —{" "}
                {c.referrer || "—"} — {c.country || "—"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
