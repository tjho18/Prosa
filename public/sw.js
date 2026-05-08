// Prosa Service Worker — cache-first for static assets, network-first for pages
const CACHE = 'prosa-v1'

const STATIC = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin GETs
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(request, c)); return res })
        .catch(() => caches.match(request).then(r => r ?? caches.match('/')))
    )
    return
  }

  // Cache-first for static assets (_next/static, fonts, images)
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/fonts')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          const c = res.clone()
          caches.open(CACHE).then(cache => cache.put(request, c))
          return res
        })
      })
    )
  }
})
