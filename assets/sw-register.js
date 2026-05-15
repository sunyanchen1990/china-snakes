(function () {
  if (!("serviceWorker" in navigator)) return;
  if (document.documentElement.classList.contains("is-ios")) return;

  window.addEventListener("load", function () {
    if ("caches" in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          if (k === "cn-snake-v1") caches.delete(k);
        });
      });
    }
    navigator.serviceWorker
      .register("sw.js", { scope: "./", updateViaCache: "none" })
      .catch(function () {});
  });
})();
