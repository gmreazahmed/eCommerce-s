import React, { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from "../../firebase"
import toast from 'react-hot-toast'

export default function OrderModal({ product, onClose }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      await addDoc(collection(db, 'orders'), {
        productTitle: product.title,
        quantity,
        name,
        phone,
        address,
        createdAt: serverTimestamp(),
        status: 'pending'
      })

      // ✅ SUCCESS POPUP
      toast.success('✅ ধন্যবাদ! আপনার অর্ডার সফলভাবে জমা হয়েছে 🎉')

      // form clear + modal বন্ধ
      setName('')
      setPhone('')
      setAddress('')
      setQuantity(1)
      onClose()

    } catch (err) {
      console.error(err)
      toast.error('❌ অর্ডার ব্যর্থ হয়েছে, আবার চেষ্টা করুন!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">অর্ডার করুন</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="text"
            placeholder="আপনার নাম"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
          />
          <input
            required
            type="tel"
            placeholder="মোবাইল নাম্বার"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input input-bordered w-full"
          />
          <textarea
            required
            placeholder="ঠিকানা"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="textarea textarea-bordered w-full"
          ></textarea>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="input input-bordered w-full"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-4"
          >
            {loading ? 'অর্ডার হচ্ছে...' : 'অর্ডার সাবমিট করুন'}
          </button>
        </form>

        <button onClick={onClose} className="mt-3 text-sm text-gray-500">
          বন্ধ করুন
        </button>
      </div>
    </div>
  )
}
