import React, { useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'

export default function AdminPage(){
  const [user,setUser] = useState<any>(null)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [orders,setOrders] = useState<any[]>([])
  const [busy,setBusy] = useState(false)

  async function login(e?:React.FormEvent){
    if (e) e.preventDefault()
    setBusy(true)
    try{
      const cred = await signInWithEmailAndPassword(auth,email,password)
      setUser(cred.user)
      fetchOrders()
    }catch(err){
      console.error(err)
      alert('Login failed')
    }finally{ setBusy(false) }
  }

  async function logout(){ await signOut(auth); setUser(null); setOrders([]) }

  async function fetchOrders(){
    setBusy(true)
    try{
      const q = query(collection(db,'orders'), orderBy('createdAt','desc'))
      const snap = await getDocs(q)
      const arr = snap.docs.map(d=>({ id:d.id, ...d.data() }))
      setOrders(arr)
    }catch(err){
      console.error(err)
      alert('Fetch failed')
    }finally{ setBusy(false) }
  }

  async function confirmOrder(id:string){
    try{
      await updateDoc(doc(db,'orders',id),{ status:'confirmed' })
      setOrders(prev => prev.map(o => o.id===id ? {...o, status:'confirmed'} : o))
    }catch(err){ console.error(err); alert('Confirm failed') }
  }

  async function removeOrder(id:string){
    if (!confirm('Delete order '+id+'?')) return
    try{
      await deleteDoc(doc(db,'orders',id))
      setOrders(prev=>prev.filter(o=>o.id!==id))
    }catch(err){ console.error(err); alert('Delete failed') }
  }

  useEffect(()=>{ const unsub = auth.onAuthStateChanged(u=>{ setUser(u); if (u) fetchOrders() }); return ()=>unsub() },[])

  return (
    <div className="card">
      {!user ? (
        <div className="max-w-md">
          <h2 className="text-xl font-semibold">Admin Login</h2>
          <form onSubmit={login} className="mt-4 grid gap-3">
            <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} className="border px-3 py-2 rounded" />
            <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="border px-3 py-2 rounded" />
            <div className="flex gap-3">
              <button className="btn" disabled={busy}>Login</button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Orders</h2>
            <div className="flex gap-2">
              <button onClick={fetchOrders} className="btn-ghost">Refresh</button>
              <button onClick={logout} className="btn-ghost">Logout</button>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="py-2">ID</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o=> (
                  <tr key={o.id} className="border-t">
                    <td className="py-2 text-sm">{o.id}</td>
                    <td>{o.productTitle}</td>
                    <td>{o.quantity}</td>
                    <td>{o.name}</td>
                    <td>{o.phone}</td>
                    <td className="whitespace-pre-wrap">{o.address}</td>
                    <td>{o.status}</td>
                    <td>
                      {o.status!=='confirmed' && <button onClick={()=>confirmOrder(o.id)} className="btn-ghost mr-2">Confirm</button>}
                      <button onClick={()=>removeOrder(o.id)} className="btn-ghost">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
