import React from "react";
import Layout from "./components/Layout";
import ShortenForm from "./components/ShortenForm";
import StatsPage from "./components/StatsPage";

export default function App() {
  return (
    <Layout>
      <section className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-2">Shorten Your Links</h2>
        <p className="text-gray-600">
          Paste a long URL below and get a short, shareable link.
        </p>
      </section>
      <ShortenForm />
      <div className="my-12" id="stats">
        <StatsPage />
      </div>
    </Layout>
  );
}
