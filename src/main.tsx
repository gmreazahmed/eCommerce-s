import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initFacebookPixel } from './facebook-pixel'
import { Toaster } from 'react-hot-toast'

initFacebookPixel()

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" reverseOrder={false} />
    </BrowserRouter>
  </React.StrictMode>
)
