import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ProductPage from './pages/ProductPage'
import AdminPage from './pages/AdminPage'

export default function App(){
  return (
    <div className="min-h-screen flex flex-col">
 
      <main className="flex-1 py-8">
        <div className="container">
          <Routes>
            <Route path="/" element={<ProductPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </div>
      </main>

      {/* <footer className="bg-white border-t py-4">
        <div className="container text-center text-sm text-gray-500">© {new Date().getFullYear()} bdz-ecommerce</div>
      </footer> */}
    </div>
  )
}
