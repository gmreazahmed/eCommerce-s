import React, { useEffect, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import toast from 'react-hot-toast'

function parsePriceToNumber(val: any) {
  if (val == null) return 0
  if (typeof val === 'number') return val
  let s = String(val)
  const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯']
  for (let i = 0; i < bn.length; i++) {
    const re = new RegExp(bn[i], 'g')
    s = s.replace(re, String(i))
  }
  s = s.replace(/[^\d.-]/g, '')
  const f = parseFloat(s)
  return isNaN(f) ? 0 : f
}

export default function OrderModal({ product, quantity: initialQuantity = 1, onClose }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(initialQuantity || 1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const unitPrice = parsePriceToNumber(product?.price)
  const totalPrice = unitPrice * (Number(quantity) || 0)
  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'নাম লিখুন'
    const digits = phone.toString().replace(/\D/g, '')
    if (digits.length < 10) errs.phone = 'ভাল মোবাইল নম্বর দিন'
    if (!address.trim()) errs.address = 'ঠিকানা লিখুন'
    if (!quantity || quantity < 1) errs.quantity = 'কমপক্ষে ১টি নির্বাচন করুন'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        productId: product?.id || null,
        productTitle: product?.title || '',
        unitPrice,
        quantity,
        totalPrice,
        name,
        phone,
        address,
        createdAt: serverTimestamp(),
        status: 'pending'
      })

      toast.success(`✅ ধন্যবাদ! অর্ডার সফলভাবে জমা হয়েছে।`)

      try {
        const notifyUrl = import.meta.env.VITE_NOTIFY_URL || '/api/notify'
        await fetch(notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: docRef.id,
            productTitle: product?.title,
            totalPrice,
            name,
            phone,
            address
          })
        })
      } catch (err) {
        console.error('Notify failed', err)
      }

      setName('')
      setPhone('')
      setAddress('')
      setQuantity(1)
      onClose?.()
    } catch (err) {
      toast.error('❌ অর্ডার ব্যর্থ হয়েছে, আবার চেষ্টা করুন!')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.target === containerRef.current && onClose?.()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">🛒 অর্ডার করুন — {product?.title}</h3>
            <p className="text-sm text-blue-100 mt-1">
              Unit: ৳ {fmt(unitPrice)} · Total: ৳ {fmt(totalPrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white text-lg font-bold"
            title="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div>
            <label className="text-sm font-medium text-gray-700">পরিমাণ </label>
            <div className="mt-2 inline-flex items-center border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100"
              >
                −
              </button>
              <input
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, +e.target.value || 1))}
                className="w-20 text-center px-3 py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            {errors.quantity && <p className="text-red-600 text-xs mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">নাম</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="আপনার নাম লিখুন"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">মোবাইল নাম্বার</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">ঠিকানা</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-2 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="ঠিকানা বিস্তারিত লিখুন"
            />
            {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* Order Summary */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex justify-between text-gray-700 text-sm">
              <span>Unit price</span>
              <span>৳ {fmt(unitPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-700 text-sm mt-1">
              <span>Quantity</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between font-semibold text-blue-700 mt-2 border-t pt-2">
              <span>Total</span>
              <span>৳ {fmt(totalPrice)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold shadow-md transition-colors"
            >
              {loading ? 'অর্ডার হচ্ছে...' : `অর্ডার করুন — ৳ ${fmt(totalPrice)}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-gray-600"
            >
              বাতিল
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            আপনার তথ্য কেবল ডেলিভারি ব্যবহারের জন্যই ব্যবহার হবে।
          </p>
        </form>
      </div>
    </div>
  )
}
