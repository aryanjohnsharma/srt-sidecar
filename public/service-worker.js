const SHELL_CACHE = 'srt-sidecar-shell-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/pwa-icon.svg', '/pwa-icon-192.png', '/pwa-icon-512.png', '/logo.svg']

async function appAssets() {
  const response = await fetch('/service-worker-assets.json')
  if (!response.ok) throw new Error('App asset manifest could not be loaded.')
  const assets = await response.json()
  return [...new Set([...APP_SHELL, ...assets.map((file) => `/${file}`)])]
}

self.addEventListener('install', (event) => {
  event.waitUntil(appAssets().then((files) => caches.open(SHELL_CACHE).then((cache) => cache.addAll(files))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('srt-sidecar-shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone()
      void caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
      return response
    }).catch(async () => (await caches.match(request)) || (await caches.match('/index.html'))))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => {
      const update = fetch(request).then((response) => {
        if (response.ok) void caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()))
        return response
      })
      return cached || update
    }))
  }
})
