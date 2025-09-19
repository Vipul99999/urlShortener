import React, { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
