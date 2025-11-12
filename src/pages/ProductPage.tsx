import React, { useState } from 'react'
import OrderModal from './components/OrderModal'
import img1 from '../products img/1.jpg'
import img2 from '../products img/2.jpg'

const product = {
  id: 'prod-001',
  title: 'হিটার জগ',
  description:
    'শীতের সকালে বা অফিসে চা–কফির সময় গরম পানি চাই এই স্মার্ট হিটার জগ দিচ্ছে আপনাকে ৫৫° অটো টেম্পারেচার কন্ট্রোল সুবিধা — পানি থাকবে গরম, আর আপনার দিন হবে আরও আরামদায়ক। গৃহিণী, অফিস ব্যবহারকারী ও ছাত্রছাত্রী — সবার জন্য পারফেক্ট।',
  price: '১,৬৫০',
  regularPrice: '২,৩৫০',
  images: [img1, img2]
}

export default function ProductPage() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [showOrder, setShowOrder] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  function inc() {
    setQuantity((q) => Math.min(q + 1, 99))
  }
  function dec() {
    setQuantity((q) => Math.max(q - 1, 1))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.pageX - left - window.scrollX) / width) * 100
    const y = ((e.pageY - top - window.scrollY) / height) * 100
    setZoomPos({ x, y })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
          
          {/* -------- Product Images -------- */}
          <div>
            <div
              className="relative overflow-hidden rounded-lg cursor-zoom-in group"
              onClick={() => setIsZoomed(!isZoomed)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={product.images[selectedImage]}
                alt="Product"
                className={`w-full h-[420px] md:h-[520px] object-cover rounded-lg transition-transform duration-300 ease-in-out ${
                  isZoomed
                    ? 'scale-150 cursor-zoom-out'
                    : 'group-hover:scale-110'
                }`}
                style={
                  isZoomed
                    ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                    : {}
                }
              />
              <div className="absolute top-3 left-3 bg-white/90 text-xs text-gray-700 px-2 py-1 rounded shadow">
                {isZoomed ? 'Zoomed 🔍' : 'Click to Zoom'}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 mt-4">
              {product.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`thumb-${i}`}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-16 object-cover rounded-md cursor-pointer transition-all border-2 ${
                    i === selectedImage
                      ? 'border-blue-600 ring-2 ring-blue-400'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* -------- Product Info -------- */}
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>

              {/* Price */}
              <div className="mt-3 flex items-center gap-3">
                <div className="text-3xl font-extrabold text-blue-600">
                  ৳ {product.price}
                </div>
                <div className="text-gray-400 line-through text-lg">
                  ৳ {product.regularPrice}
                </div>
              </div>

              {/* Quantity + Buy */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={dec}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-lg"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))
                    }
                    className="w-16 text-center py-2 outline-none"
                  />
                  <button
                    onClick={inc}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-lg"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => setShowOrder(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md px-6 py-3 shadow transition-all"
                >
                  Buy Now
                </button>
              </div>

              {/* Description */}
              <p className="mt-6 text-gray-700 leading-relaxed text-justify">
                {product.description}
              </p>

              {/* Features */}
              <ul className="mt-4 text-gray-600 text-sm space-y-1">
                <li>✔️ ৫৫° অটো টেম্পারেচার কন্ট্রোল</li>
                <li>✔️ স্টেইনলেস স্টিল ইনার লেয়ার</li>
                <li>✔️ দ্রুত পানি গরম করে</li>
              </ul>
            </div>

            {/* Trust badges */}
            <div className="mt-6 text-sm text-gray-600 border-t pt-4 flex flex-wrap gap-4">
              <span>🚚 ফ্রি হোম ডেলিভারি</span>
              <span>💵 ক্যাশ অন ডেলিভারি</span>
              <span>🔁 ৭ দিনের রিটার্ন পলিসি</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrder && (
        <OrderModal
          product={product}
          quantity={quantity}
          onClose={() => setShowOrder(false)}
        />
      )}
    </div>
  )
}
