// Carregado pelo service worker gerado pelo vite-plugin-pwa (workbox.importScripts).

self.addEventListener('push', (evento) => {
  let aviso = {}
  try {
    aviso = evento.data ? evento.data.json() : {}
  } catch {
    aviso = { corpo: evento.data ? evento.data.text() : '' }
  }

  evento.waitUntil(
    Promise.all([
      self.registration.showNotification(aviso.titulo || 'SIGCF', {
        body: aviso.corpo || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        tag: aviso.tag,
        renotify: Boolean(aviso.tag),
        data: { url: aviso.url || '/' },
      }),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((janelas) => janelas.forEach((janela) => janela.postMessage({ tipo: 'sigcf:atualizar' }))),
    ]),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = new URL(evento.notification.data?.url || '/', self.location.origin).href

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((janela) => janela.url.startsWith(self.location.origin))
      if (aberta) {
        return aberta
          .focus()
          .then((janela) => janela.navigate(url))
          .catch(() => undefined)
      }
      return self.clients.openWindow(url)
    }),
  )
})
