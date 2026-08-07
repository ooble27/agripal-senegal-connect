// Service Worker Ooble — notifications push.
self.addEventListener("push", (event) => {
  let payload = { title: "Ooble", body: "", url: "/app" };
  try { payload = { ...payload, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).pathname === url && "focus" in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});
