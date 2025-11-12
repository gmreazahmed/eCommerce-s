import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ProductPage from './pages/ProductPage'
import AdminPage from './pages/AdminPage'

export default function App(){
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-lg font-semibold">E-ecommerce</h1>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container">
          <Routes>
            <Route path="/" element={<ProductPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-white border-t py-4">
        <div className="container text-center text-sm text-gray-500">© {new Date().getFullYear()} bdz-ecommerce</div>
      </footer>
    </div>
  )
}
