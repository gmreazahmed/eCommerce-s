import React, { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db, firebaseServerTimestamp } from '../../firebase'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { fbTrack } from '../../facebook-pixel'

dayjs.extend(utc)
dayjs.extend(timezone)

export default function OrderModal({ product, onClose }:{product:any,onClose:()=>void}){
  const [quantity,setQuantity] = useState<number>(1)
  const [name,setName] = useState('')
  const [phone,setPhone] = useState('')
  const [address,setAddress] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')

  async function placeOrder(){
    if (!name || !phone || !address) { alert('Please fill name, phone and address'); return }
    setBusy(true)
    try{
      const dhakaNow = dayjs().tz('Asia/Dhaka').format('YYYY-MM-DD HH:mm:ss')
      const docRef = await addDoc(collection(db,'orders'),{
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        quantity,
        name, phone, address,
        status: 'pending',
        createdAt: firebaseServerTimestamp(),
        date_local_dhaka: dhakaNow
      })
      const total = product.price * quantity
      try { fbTrack('Purchase', { value: total, currency: 'BDT', content_ids: [product.id], content_name: product.title }) } catch(e){}
      setMessage('Order placed. ID: ' + docRef.id)
      setTimeout(()=>{ onClose() }, 1200)
    }catch(err){
      console.error(err)
      alert('Failed to place order')
    }finally{ setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full md:w-2/3 p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Order — {product.title}</h3>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <div className="mt-4 grid gap-3">
          <input type="number" min={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="border px-3 py-2 rounded" />
          <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} className="border px-3 py-2 rounded" />
          <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="border px-3 py-2 rounded" />
          <textarea placeholder="Address" value={address} onChange={e=>setAddress(e.target.value)} className="border px-3 py-2 rounded" />
          <div className="flex gap-3">
            <button onClick={placeOrder} disabled={busy} className="btn">Place Order</button>
            <button onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
          {message && <p className="text-green-600">{message}</p>}
        </div>
      </div>
    </div>
  )
}
