import React, { useState } from 'react'
import OrderModal from './components/OrderModal'
import img1 from '../products img/1.jpg'
import img2 from '../products img/2.jpg'


const product = {
  id: 'prod-001',
  title: 'হিটার জগ গরম পানির সহজ সমাধান!',
  description: 'শীতের সকালে বা অফিসে চা–কফির সময় গরম পানি চাই এই স্মার্ট হিটার জগ দিচ্ছে আপনাকে ৫৫° অটো টেম্পারেচার কন্ট্রোল সুবিধা — পানি থাকবে গরম, আর আপনার দিন হবে আরও আরামদায়ক ☕🏠 গৃহিণী, অফিস ব্যবহারকারী ও ছাত্রছাত্রী — সবার জন্য পারফেক্ট 📦 আজই অর্ডার করুন স্টক সীমিত  এখনই ইনবক্স করুন 🔥',
  price: '১,৬৫০',
  regularPrice: '২,৩৫০',
  images: [
     img1,
     img2
  ]
}

export default function ProductPage(){
  const [selectedImage, setSelectedImage] = useState(0)
  const [showOrder, setShowOrder] = useState(false)

  return (
    <div className="card">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <img src={product.images[selectedImage]} alt="product" className="w-full rounded-lg" />
          <div className="flex gap-3 mt-3">
            {product.images.map((src,i)=> (
              <img key={i} src={src} alt={`thumb-${i}`} className={`w-20 h-14 object-cover rounded-md cursor-pointer ${i===selectedImage?'ring-2 ring-blue-600':''}`} onClick={()=>setSelectedImage(i)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">{product.title}</h2>
          <p className="text-gray-500 mt-2">{product.description}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-2xl font-bold text-blue-600">৳ {product.price}</div>
            <div className="text-sm text-gray-400 line-through">৳ {product.regularPrice}</div>
          </div>
          <div className="mt-6">
            <button className="btn" onClick={()=>setShowOrder(true)}>Buy Now</button>
          </div>
        </div>
      </div>

      {showOrder && <OrderModal product={product} onClose={()=>setShowOrder(false)} />}
    </div>
  )
}
