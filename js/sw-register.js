if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    Promise.resolve()
      .then(() => navigator.serviceWorker.getRegistrations())
      .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
      .then(() => {
        if (!("caches" in window)) return;
        return caches.keys().then((keys) =>
          Promise.all(keys.filter((key) => key.startsWith("lumora-")).map((key) => caches.delete(key)))
        );
      })
      .catch(() => {});
  });
}

