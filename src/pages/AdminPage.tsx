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
  updateDoc
} from 'firebase/firestore'

// Helper functions for CSV export
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

  // Date filter (yyyy-mm-dd strings)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // dark mode
  const [dark, setDark] = useState<boolean>(false)

  // notification sound audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // track previous orders count for notification
  const prevCountRef = useRef<number>(0)

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // init audio
  useEffect(() => {
    audioRef.current = new Audio(
      // short click sound (base64 small beep) — avoids external asset
      'data:audio/mp3;base64,SUQzAwAAAAAAJ1RySUQzAwAAAAAA'
    )
    // above is an empty stub base64; browsers may not play it — so better to create a small oscillator fallback when needed
    return () => {
      audioRef.current = null
    }
  }, [])

  // persist dark mode to localStorage & apply to document
  useEffect(() => {
    try {
      localStorage.setItem('bdz_dark', dark ? '1' : '0')
    } catch {}
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])

  async function login(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      setUser(cred.user)
      fetchOrders()
    } catch (err) {
      console.error(err)
      alert('Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setOrders([])
  }

  async function fetchOrders() {
    setBusy(true)
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setOrders(arr)
    } catch (err) {
      console.error(err)
      alert('Fetch failed')
    } finally {
      setBusy(false)
    }
  }

  async function confirmOrder(id: string) {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'confirmed' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'confirmed' } : o)))
    } catch (err) {
      console.error(err)
      alert('Confirm failed')
    }
  }

  async function removeOrder(id: string) {
    if (!confirm('Delete this order?')) return
    try {
      await deleteDoc(doc(db, 'orders', id))
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      console.error(err)
      alert('Delete failed')
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u)
      if (u) fetchOrders()
    })
    return () => unsub()
  }, [])

  // helper: normalize createdAt to Date
  function getCreatedDate(o: any): Date | null {
    const v = o?.createdAt
    if (!v) return null
    // Firestore Timestamp has toDate()
    if (v?.toDate && typeof v.toDate === 'function') return v.toDate()
    // if it's ISO string
    if (typeof v === 'string') {
      const d = new Date(v)
      return isNaN(d.getTime()) ? null : d
    }
    // if it's seconds/nanoseconds object
    if (v?.seconds) {
      return new Date(v.seconds * 1000)
    }
    // Date already
    if (v instanceof Date) return v
    return null
  }

  // Filtering with search, status, and date range
  const filteredOrders = useMemo(() => {
    const s = debouncedSearch.toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false

      // date filter
      const d = getCreatedDate(o)
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00')
        if (!d || d < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59.999')
        if (!d || d > to) return false
      }

      if (!s) return true
      const fields = [
        (o.productTitle || '').toString().toLowerCase(),
        (o.name || '').toString().toLowerCase(),
        (o.phone || '').toString().toLowerCase(),
        (o.address || '').toString().toLowerCase()
      ]
      return fields.some((f) => f.includes(s))
    })
  }, [orders, debouncedSearch, statusFilter, dateFrom, dateTo])

  // notification: play sound when new orders arrived (count increases)
  useEffect(() => {
    const prev = prevCountRef.current
    const curr = orders.length
    if (prev === 0) {
      prevCountRef.current = curr
      return
    }
    if (curr > prev) {
      // play beep — try audio element first; fallback to oscillator
      const audio = audioRef.current
      let played = false
      if (audio) {
        try {
          audio.currentTime = 0
          audio.play()?.then(() => { }).catch(() => { })
          played = true
        } catch {}
      }
      if (!played && typeof window.AudioContext !== 'undefined') {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = 'sine'
          o.frequency.value = 880
          o.connect(g)
          g.connect(ctx.destination)
          g.gain.value = 0.05
          o.start()
          setTimeout(() => {
            o.stop()
            try { ctx.close() } catch {}
          }, 200)
        } catch {}
      }
    }
    prevCountRef.current = curr
  }, [orders])

  // CSV columns
  const csvColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'productTitle', label: 'Product' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'name', label: 'Customer Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'CreatedAt' }
  ]

  function downloadCsv(rows: any[], filename = 'orders.csv') {
    const csv = toCsv(rows, csvColumns)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function copyCsvToClipboard(rows: any[]) {
    const csv = toCsv(rows, csvColumns)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(csv)
        alert('CSV copied to clipboard — এখন Google Sheets এ গিয়ে Ctrl+V করুন।')
      } else {
        window.prompt('Copy CSV below (Ctrl+C):', csv)
      }
    } catch {
      window.prompt('Copy CSV below (Ctrl+C):', csv)
    }
  }

  async function openInGoogleSheets(rows: any[]) {
    await copyCsvToClipboard(rows)
    window.open('https://docs.google.com/spreadsheets/u/0/', '_blank')
    setTimeout(() => {
      alert('Google Sheets খুলেছে ✅ এখন A1 সেলে গিয়ে Ctrl+V দিন।')
    }, 500)
  }

  // small helper to show readable createdAt
  function formatCreated(o: any) {
    const d = getCreatedDate(o)
    if (!d) return ''
    return d.toLocaleString()
  }

  const totalCount = orders.length
  const shownCount = filteredOrders.length
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length

  return (
    <div className="h-screen w-full bg-gray-100 overflow-hidden">
      <div className="h-full w-full flex flex-col">
        {/* STICKY header with gradient */}
        <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-md">
          <div className="w-full px-3 md:px-6 py-3 max-w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-lg md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                Orders Dashboard
              </h1>
              <p className="text-xs md:text-sm opacity-90 mt-1">
                Total: <b>{totalCount}</b> · Pending: <b>{pendingCount}</b> · Confirmed: <b>{confirmedCount}</b>
              </p>
            </div>

            {user && (
              <div className="flex flex-wrap justify-end gap-2 w-full md:w-auto items-center">
                {/* search */}
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded px-3 py-1.5 text-sm">
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path>
                  </svg>
                  <input
                    placeholder="Search product / name / phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent outline-none w-36 md:w-56 placeholder-white/80 text-white text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-white/80 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white text-gray-800 px-3 py-1.5 rounded border border-gray-300 text-sm font-medium"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>

                {/* date range */}
                <div className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 text-sm">
                  <label className="text-xs opacity-90 mr-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-sm rounded px-2 py-1 outline-none"
                  />
                  <label className="text-xs opacity-90 ml-2 mr-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-sm rounded px-2 py-1 outline-none"
                  />
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    className="ml-2 text-xs underline"
                    title="Clear dates"
                  >
                    Clear
                  </button>
                </div>

                {/* Refresh / Logout */}
                <button
                  onClick={fetchOrders}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium"
                >
                  Refresh
                </button>

                <button
                  onClick={logout}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                >
                  Logout
                </button>

                {/* CSV */}
                <button
                  onClick={() => downloadCsv(filteredOrders)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm font-semibold"
                >
                  CSV ⬇️
                </button>

                <button
                  onClick={() => openInGoogleSheets(filteredOrders)}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded text-sm font-semibold"
                >
                  Google Sheets 📊
                </button>

                {/* Dark mode */}
                <button
                  onClick={() => setDark(d => !d)}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded flex items-center gap-2 text-sm"
                  title="Toggle dark mode"
                >
                  {dark ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* main content */}
        <main className="flex-1 overflow-auto">
          <div className="w-full p-4 md:p-6">
            {!user ? (
              <div className="flex justify-center items-center h-[70vh]">
                <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4 text-center">Admin Login</h2>
                  <form onSubmit={login} className="grid gap-3">
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border px-3 py-2 rounded"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border px-3 py-2 rounded"
                    />
                    <button
                      disabled={busy}
                      className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                      {busy ? 'Logging in...' : 'Login'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white w-full rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full text-sm md:text-base border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-700">
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
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{o.productTitle}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatCreated(o)}</div>
                        </td>
                        <td className="py-3 px-4">{o.quantity}</td>
                        <td className="py-3 px-4">{o.name}</td>
                        <td className="py-3 px-4">{o.phone}</td>
                        <td className="py-3 px-4 whitespace-pre-wrap break-words">{o.address}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-semibold ${
                              o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            {o.status !== 'confirmed' && (
                              <button onClick={() => confirmOrder(o.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                                Confirm
                              </button>
                            )}
                            <button onClick={() => removeOrder(o.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          কোনো অর্ডার পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              Showing <b>{shownCount}</b> of <b>{totalCount}</b> orders.
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// helper function moved here to keep file complete
function formatCreated(o: any) {
  const v = o?.createdAt
  if (!v) return ''
  if (v?.toDate && typeof v.toDate === 'function') {
    return v.toDate().toLocaleString()
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? '' : d.toLocaleString()
  }
  if (v?.seconds) return new Date(v.seconds * 1000).toLocaleString()
  if (v instanceof Date) return v.toLocaleString()
  return ''
}
