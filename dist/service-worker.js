const CACHE_NAME = "nakaru-san-pwa-20260601-notifications-reactions-dragon";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./supabase.min.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./nakaru-san-logo.png",
  "./nakaru-hoodies-banner.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./offline.html")))
    );
    return;
  }

  if (["style", "script", "image", "manifest", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "You have a new Nakaru-San notification." };
  }
  const title = payload.title || "Nakaru-San";
  const options = {
    body: payload.body || "You have a new message, request, incoming call, or live room invite.",
    icon: payload.icon || "./icons/icon-192.png",
    badge: payload.badge || "./icons/maskable-192.png",
    tag: payload.tag || "nakaru-notification",
    renotify: true,
    requireInteraction: ["video-call", "audio-call", "call", "live-invite", "live"].includes(payload.type),
    data: payload.data || { page: payload.page || "messages" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const page = event.notification.data?.page || "messages";
  const targetUrl = new URL(`./#${page}`, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
