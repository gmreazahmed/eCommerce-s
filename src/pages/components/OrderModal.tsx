import React, { useEffect, useRef, useState } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "../../firebase"
import toast from "react-hot-toast"

/**
 * Optional confetti: dynamically import react-confetti if available.
 * This avoids runtime error when package is not installed.
 */
type ConfettiCompType = React.ComponentType<any> | null

function parsePriceToNumber(val: any) {
  if (val == null) return 0
  if (typeof val === "number") return val
  let s = String(val)
  const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"]
  for (let i = 0; i < bn.length; i++) {
    const re = new RegExp(bn[i], "g")
    s = s.replace(re, String(i))
  }
  s = s.replace(/[^\d.-]/g, "")
  const f = parseFloat(s)
  return isNaN(f) ? 0 : f
}

export default function OrderModal({
  product,
  quantity: initialQuantity = 1,
  onClose,
}: {
  product: any
  quantity?: number
  onClose?: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [quantity, setQuantity] = useState<number>(initialQuantity || 1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  // thank-you popup state
  const [showThanks, setShowThanks] = useState(false)
  // confetti component if available
  const [ConfettiComp, setConfettiComp] = useState<ConfettiCompType>(null)

  // compute prices
  const unitPrice = parsePriceToNumber(product?.price)
  const totalPrice = unitPrice * (Number(quantity) || 0)
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)

  useEffect(() => {
    // focus name input slightly after mount
    setTimeout(() => nameRef.current?.focus(), 40)

    // prevent background scrolling
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // ESC to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.()
      }
    }
    window.addEventListener("keydown", onKey)

    // try to dynamically import react-confetti (optional)
    import("react-confetti")
      .then((mod) => setConfettiComp(() => mod.default))
      .catch(() => {
        /* ignore if not installed */
      })

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "নাম লিখুন"
    const digits = phone.toString().replace(/\D/g, "")
    if (digits.length < 10) errs.phone = "ভাল মোবাইল নম্বর দিন"
    if (!address.trim()) errs.address = "ঠিকানা লিখুন"
    if (!quantity || quantity < 1) errs.quantity = "কমপক্ষে ১টি নির্বাচন করুন"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const docRef = await addDoc(collection(db, "orders"), {
        productId: product?.id || null,
        productTitle: product?.title || "",
        unitPrice,
        quantity,
        totalPrice,
        name,
        phone,
        address,
        createdAt: serverTimestamp(),
        status: "pending",
      })

      // show inline success toast quickly
      toast.success("✅ অর্ডার জমা হয়েছে")

      // show animated thank-you popup with confetti
      setShowThanks(true)

      // notify serverless backend (optional) - non-blocking
      (async () => {
        try {
          const notifyUrl = (import.meta.env as any).VITE_NOTIFY_URL || "/api/notify"
          await fetch(notifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: docRef.id,
              productTitle: product?.title,
              unitPrice,
              quantity,
              totalPrice,
              name,
              phone,
              address,
            }),
          })
        } catch (err) {
          console.error("Notify failed", err)
        }
      })()

      // clear form (but keep thank you visible a moment)
      setName("")
      setPhone("")
      setAddress("")
      setQuantity(1)

      // auto close thank-you after 3s and then close modal
      setTimeout(() => {
        setShowThanks(false)
        onClose?.()
      }, 3200)
    } catch (err) {
      console.error(err)
      toast.error("❌ অর্ডার জমা দিতে সমস্যা হয়েছে — আবার চেষ্টা করুন")
    } finally {
      setLoading(false)
    }
  }

  function backdropClick(e: React.MouseEvent) {
    if (e.target === containerRef.current) onClose?.()
  }

  return (
    <>
      {/* Modal Backdrop + Form */}
      <div
        ref={containerRef}
        onClick={backdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden transform transition-all"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 id="order-modal-title" className="text-lg font-semibold">
                🛒 অর্ডার করুন — {product?.title}
              </h3>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">পরিমাণ</label>
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
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "1", 10)
                    setQuantity(isNaN(v) ? 1 : Math.max(1, v))
                  }}
                  className="w-20 text-center px-3 py-2 outline-none"
                  aria-label="Quantity"
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

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">নাম</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="আপনার নাম লিখুন"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">মোবাইল নাম্বার</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="01XXXXXXXXX"
                inputMode="tel"
              />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ঠিকানা</label>
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
                {loading ? "অর্ডার হচ্ছে..." : `অর্ডার করুন — ৳ ${fmt(totalPrice)}`}
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
              আপনার তথ্য কেবল ডেলিভারি ব্যবহারের জন্যই ব্যবহার করা হবে।
            </p>
          </form>
        </div>
      </div>

      {/* Thank-you popup (center) */}
      {showThanks && (
        <>
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            {/* dim background */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative z-10 pointer-events-auto max-w-sm w-[90%] mx-auto">
              <div className="bg-white rounded-2xl p-6 shadow-2xl text-center animate-pop">
                <div className="text-5xl mb-2">🎉</div>
                <h4 className="text-xl font-bold text-gray-800 mb-1">ধন্যবাদ!</h4>
                <p className="text-sm text-gray-600 mb-4">
                  আপনার অর্ডার সফলভাবে জমা হয়েছে। আমরা দ্রুত যোগাযোগ করবো।
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowThanks(false)
                      onClose?.()
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    ঠিক আছে
                  </button>
                </div>
              </div>
            </div>

            {/* optional confetti */}
            {ConfettiComp ? (
              // ConfettiComp is dynamically imported component
              <ConfettiComp width={typeof window !== "undefined" ? window.innerWidth : 800} height={typeof window !== "undefined" ? window.innerHeight : 600} recycle={false} numberOfPieces={180} />
            ) : null}
          </div>

          {/* Small CSS keyframes for pop animation (inline via style tag) */}
          <style>{`
            @keyframes popIn {
              0% { transform: scale(.9); opacity: 0 }
              60% { transform: scale(1.03); opacity: 1 }
              100% { transform: scale(1); opacity: 1 }
            }
            .animate-pop {
              animation: popIn 360ms cubic-bezier(.2,.9,.3,1);
            }
          `}</style>
        </>
      )}
    </>
  )
}
