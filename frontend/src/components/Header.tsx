import React from "react";

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">URL Shortener</h1>
        <nav className="space-x-4">
          <a href="/" className="text-gray-700 hover:text-blue-600 hover:font-bold">
            Home
          </a>
          <a href="#stats" className="text-gray-700 hover:text-blue-600 hover:font-bold">
            Stats
          </a>
        </nav>
      </div>
    </header>
  );
}
