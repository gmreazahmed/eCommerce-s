const PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID || ''

export function initFacebookPixel() {
  if (!PIXEL_ID) return
  if ((window as any).fbq) return

  ;(function(f: any, b, e, v, n?, t?, s?) {
    if (f.fbq) return
    n = f.fbq = function() { (n.callMethod ? n.callMethod : n).apply(n, arguments) }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script')

  ;(window as any).fbq('init', PIXEL_ID)
  ;(window as any).fbq('track', 'PageView')
}

export function fbTrack(event: string, data?: Record<string, any>){
  if (!(window as any).fbq) return
  ;(window as any).fbq('track', event, data)
}

export default { initFacebookPixel, fbTrack }
