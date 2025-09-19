import React from "react";

export default function ResultList({
  results,
}: {
  results: Array<{ shortLink: string; expiry: string }>;
}) {
  if (!results.length) return null;
  return (
    <div className="mt-6 space-y-3">
      {results.map((r, i) => (
        <div
          key={i}
          className="p-3 border rounded bg-gray-50 shadow-sm flex justify-between"
        >
          <div>
            <a
              href={r.shortLink}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              {r.shortLink}
            </a>
            <p className="text-sm text-gray-500">
              Expires: {new Date(r.expiry).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
