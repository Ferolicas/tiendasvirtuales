// Service worker de Vendi: notificaciones push de pedidos.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Vendi", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Vendi";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard/orders" },
      tag: data.tag,
      renotify: Boolean(data.tag),
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/orders";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (windows) => {
        for (const client of windows) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }
    )
  );
});
