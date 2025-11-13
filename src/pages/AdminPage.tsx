import React, { useEffect, useMemo, useRef, useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch
} from 'firebase/firestore'

/* CSV helpers (same as before) */
function escapeCsvCell(value: any) {
  if (value === null || value === undefined) return ''
  const s = value.toString()
  const needsQuotes = /[",\n\r]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}
function toCsv(rows: any[], columns: { key: string; label: string }[]) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',')
  const lines = rows.map((r) =>
    columns.map((c) => escapeCsvCell(r[c.key])).join(',')
  )
  return [header, ...lines].join('\n')
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCountRef = useRef<number>(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    audioRef.current = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAJ1RySUQzAwAAAAAA')
    return () => { audioRef.current = null }
  }, [])

  async function login(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      setUser(cred.user)
      fetchOrders()
    } catch {
      alert('Login failed')
    }
    setBusy(false)
  }

  function logout() {
    signOut(auth)
    setUser(null)
    setOrders([])
  }

  async function fetchOrders() {
    setBusy(true)
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setSelectedIds(new Set())
    } catch {
      alert('Fetch failed')
    }
    setBusy(false)
  }

  async function confirmOrder(id: string) {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'confirmed' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'confirmed' } : o)))
    } catch {
      alert('Confirm failed')
    }
  }

  async function removeOrder(id: string) {
    if (!confirm('Delete this order?')) return
    try {
      await deleteDoc(doc(db, 'orders', id))
      setOrders((prev) => prev.filter((o) => o.id !== id))
      setSelectedIds((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    } catch {
      alert('Delete failed')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAllVisible() {
    const ids = new Set(filteredOrders.map((o) => o.id))
    setSelectedIds(ids)
  }
  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function bulkConfirm() {
    if (selectedIds.size === 0) return
    if (!confirm(`Confirm ${selectedIds.size} selected orders?`)) return
    setBusy(true)
    try {
      const batch = writeBatch(db as any)
      selectedIds.forEach((id) => batch.update(doc(db, 'orders', id), { status: 'confirmed' } as any))
      await batch.commit()
      setOrders((prev) => prev.map((o) => (selectedIds.has(o.id) ? { ...o, status: 'confirmed' } : o)))
      setSelectedIds(new Set())
    } catch (err) {
      console.error(err)
      alert('Bulk confirm failed')
    }
    setBusy(false)
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Permanently delete ${selectedIds.size} selected orders?`)) return
    setBusy(true)
    try {
      const batch = writeBatch(db as any)
      selectedIds.forEach((id) => batch.delete(doc(db, 'orders', id)))
      await batch.commit()
      setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
    } catch (err) {
      console.error(err)
      alert('Bulk delete failed')
    }
    setBusy(false)
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u)
      if (u) fetchOrders()
    })
    return () => unsub()
  }, [])

  function getDate(o: any) {
    const v = o?.createdAt
    if (!v) return null
    if (v?.toDate) return v.toDate()
    if (v?.seconds) return new Date(v.seconds * 1000)
    if (typeof v === 'string') return new Date(v)
    return null
  }

  const filteredOrders = useMemo(() => {
    const s = debouncedSearch.toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      const d = getDate(o)
      if (dateFrom && (!d || d < new Date(dateFrom + 'T00:00:00'))) return false
      if (dateTo && (!d || d > new Date(dateTo + 'T23:59:59.999'))) return false
      if (!s) return true
      return [
        o.productTitle?.toString().toLowerCase() || '',
        o.name?.toString().toLowerCase() || '',
        o.phone?.toString().toLowerCase() || '',
        o.address?.toString().toLowerCase() || ''
      ].some((f) => f.includes(s))
    })
  }, [orders, debouncedSearch, statusFilter, dateFrom, dateTo])

  function isSameDay(d: Date) {
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }
  function getOrderTotal(o: any) {
    if (o?.totalPrice != null && !isNaN(Number(o.totalPrice))) return Number(o.totalPrice)
    const unit = o?.unitPrice != null ? Number(o.unitPrice) : (o?.price ? parseFloat(String(o.price).replace(/[^0-9.-]/g, '')) : NaN)
    const qty = o?.quantity != null ? Number(o.quantity) : 1
    const u = isNaN(unit) ? 0 : unit
    const q = isNaN(qty) ? 1 : qty
    return u * q
  }

  const todayOrders = orders.filter((o) => { const d = getDate(o); return d ? isSameDay(d) : false })
  const todayOrdersCount = todayOrders.length
  const todayRevenue = todayOrders.reduce((s, o) => s + getOrderTotal(o), 0)

  const csvColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'productTitle', label: 'Product' },
    { key: 'quantity', label: 'Qty' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created At' }
  ]
  function downloadCsv() {
    const csv = toCsv(filteredOrders, csvColumns)
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'orders.csv'
    a.click()
  }

  useEffect(() => {
    const prev = prevCountRef.current
    const curr = orders.length
    if (prev === 0) { prevCountRef.current = curr; return }
    if (curr > prev) {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play?.().catch(() => {})
      }
    }
    prevCountRef.current = curr
  }, [orders])

  const totalCount = orders.length
  const shownCount = filteredOrders.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 py-6">

        {/* header: use flex — left title, right controls (no absolute) */}
        <header className="bg-white rounded-xl shadow p-5 mb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

            {/* left: title + meta */}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Orders Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Total: <b>{totalCount}</b> · Pending: <b>{orders.filter(o=>o.status==='pending').length}</b> · Confirmed: <b>{orders.filter(o=>o.status==='confirmed').length}</b>
              </p>
            </div>

            {/* right: top row controls incl Logout (small) and summary cards beneath in column */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                {/* Logout small button (no overlap) */}
                {user && (
                  <button onClick={logout} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                    Logout
                  </button>
                )}
              </div>

              {/* summary cards (compact) */}
              <div className="flex gap-2 items-center">
                <div className="bg-blue-50 px-3 py-2 rounded text-sm">
                  <div className="text-xs text-blue-700">Today's Orders</div>
                  <div className="text-lg font-semibold text-blue-900">{todayOrdersCount}</div>
                </div>
                <div className="bg-emerald-50 px-3 py-2 rounded text-sm">
                  <div className="text-xs text-emerald-700">Today's Revenue</div>
                  <div className="text-lg font-semibold text-emerald-900">৳ {todayRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                </div>
              </div>
            </div>
          </div>

          {/* secondary toolbar: compact controls, allow wrap, prevent overflow */}
          {user && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded px-3 py-1.5 flex-1 min-w-[160px] max-w-md">
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path>
                </svg>
                <input placeholder="Search product / name / phone" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="bg-transparent outline-none text-sm w-full" />
                {searchTerm && <button onClick={()=>setSearchTerm('')} className="text-gray-500 text-sm ml-2">✕</button>}
              </div>

              <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="px-3 py-1.5 rounded border text-sm bg-white">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>

              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="text-sm rounded border px-2 py-1"/>
                <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="text-sm rounded border px-2 py-1"/>
                {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom(''); setDateTo('')}} className="text-xs underline text-gray-600">Clear</button>}
              </div>

              <button onClick={fetchOrders} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm">Refresh</button>
              <button onClick={downloadCsv} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">CSV ⬇</button>

            </div>
          )}
        </header>

        {/* Bulk toolbar if any selected */}
        {user && selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm">Selected: <b>{selectedIds.size}</b></div>
            <div className="flex gap-2">
              <button onClick={bulkConfirm} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">Confirm selected</button>
              <button onClick={bulkDelete} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Delete selected</button>
              <button onClick={clearSelection} className="px-3 py-1.5 bg-gray-100 rounded text-sm">Clear</button>
            </div>
          </div>
        )}

        {/* main */}
        {!user ? (
          <div className="flex justify-center mt-10">
            <div className="w-full max-w-md bg-white shadow rounded p-6">
              <h2 className="text-xl font-semibold text-center mb-4">Admin Login</h2>
              <form onSubmit={login} className="grid gap-3">
                <input type="email" placeholder="Admin Email" value={email} onChange={e=>setEmail(e.target.value)} className="border px-3 py-2 rounded"/>
                <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="border px-3 py-2 rounded"/>
                <button className="bg-blue-600 text-white py-2 rounded">{busy? 'Logging in...':'Login'}</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr className="text-left text-gray-700">
                    <th className="py-3 px-4 w-12">
                      <input type="checkbox" checked={filteredOrders.length>0 && filteredOrders.every(o=>selectedIds.has(o.id))} onChange={(e)=>{ if(e.target.checked) selectAllVisible(); else clearSelection() }} />
                    </th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 w-[80px]">Qty</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 w-[150px]">Phone</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 w-[120px]">Status</th>
                    <th className="py-3 px-4 text-center w-[180px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {filteredOrders.map((o) => {
                    const isSel = selectedIds.has(o.id)
                    return (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={()=>toggleSelect(o.id)} /></td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{o.productTitle}</div>
                          <div className="text-xs text-gray-500 mt-1">{getDate(o)?.toLocaleString() || ''}</div>
                        </td>
                        <td className="py-3 px-4">{o.quantity}</td>
                        <td className="py-3 px-4">{o.name}</td>
                        <td className="py-3 px-4">{o.phone}</td>
                        <td className="py-3 px-4 whitespace-pre-wrap">{o.address}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-sm font-semibold ${o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            {o.status !== 'confirmed' && <button onClick={()=>confirmOrder(o.id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Confirm</button>}
                            <button onClick={()=>removeOrder(o.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">কোনো অর্ডার পাওয়া যায়নি।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mt-3">Showing <b>{shownCount}</b> of <b>{totalCount}</b> orders.</p>
      </div>
    </div>
  )
}
