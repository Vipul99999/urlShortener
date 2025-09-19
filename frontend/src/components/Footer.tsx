import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between text-sm text-gray-600">
        <p>&copy; {new Date().getFullYear()} URL Shortener</p>
        <a
          href="https://github.com/yourusername"
          target="_blank"
          rel="noreferrer"
          className="hover:text-blue-600"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
