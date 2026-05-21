self.addEventListener('push', (event) => {
  let payload = { title: 'Explorer', body: 'Tienes una nueva notificación.' };
  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || parsed.description || payload.body,
      };
    } catch (error) {
      const text = event.data.text();
      payload = { title: 'Explorer', body: text || payload.body };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `explorer-push-${Date.now()}`,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
