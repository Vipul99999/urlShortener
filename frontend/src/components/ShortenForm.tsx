import React, { useState } from "react";
import { postShorturl } from "../api/apiClient";
import ResultList from "./ResultList";

export default function ShortenForm() {
  const [url, setUrl] = useState("");
  const [validity, setValidity] = useState<number | "">(30);
  const [shortcode, setShortcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ shortLink: string; expiry: string }>
  >([]);
  const [isBlinking, setIsBlinking] = useState(false);

  const handleClick = () => {
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 300); // Duration of blink
  };


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: any = { url };
      if (validity) payload.validity = Number(validity);
      if (shortcode) payload.shortcode = shortcode;
      const data = await postShorturl(payload);
      setResults((prev) => [
        { shortLink: data.shortLink, expiry: data.expiry },
        ...prev,
      ]);
      setUrl("");
      setShortcode("");
    } catch (err: any) {
      setError(err?.error || "Something went wrong");
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      {error && (
        <p className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3">{error}</p>
      )}
      <form
        onSubmit={onSubmit}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input
          type="url"
          placeholder="Enter long URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="border rounded px-3 py-2 col-span-full sm:col-span-2"
        />
        <input
          type="number"
          placeholder="Validity (minutes)"
          value={validity as any}
          onChange={(e) =>
            setValidity(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Custom Shortcode (optional)"
          value={shortcode}
          onChange={(e) => setShortcode(e.target.value)}
          className="border rounded px-3 py-2 col-span-full sm:col-span-2"
        />
        <button
      type="submit"
      onClick={handleClick}
      className={`bg-blue-500 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded col-span-full sm:col-span-1 transition-all ${
        isBlinking ? 'animate-ping' : ''
      }`}
    >
      Create
    </button>

      </form>

      <ResultList results={results} />
    </div>
  );
}
