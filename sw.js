const CACHE_NAME = "lumora-v10";
const ASSETS = [
  "./",
  "index.html",
  "about/index.html",
  "privacy/index.html",
  "saved/index.html",
  "thankyou/index.html",
  "submit/index.html",
  "story/index.html",
  "css/styles.css",
  "js/app.js",
  "js/submit.js",
  "js/saved.js",
  "js/story.js",
  "js/theme.js",
  "js/sw-register.js",
  "data/stories.json",
  "lumoranew.png",
  "search-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match("index.html"));
      return cached || fetchPromise;
    })
  );
});
