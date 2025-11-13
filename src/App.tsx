import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ProductPage from './pages/ProductPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Routes>
            <Route path="/" element={<ProductPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </div>
      </main>

      {/* 🌈 Elegant Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white mt-10 shadow-inner">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Left side */}
          <p className="text-sm">
            © {new Date().getFullYear()} <span className="font-semibold">eCommerce S</span> — All rights reserved.
          </p>

          {/* Right side */}
          <p className="text-sm">
            Developed by{" "}
            <a
              href="https://www.gmreaz.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-yellow-300 hover:text-white transition duration-200"
            >
              GM Reaz
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
