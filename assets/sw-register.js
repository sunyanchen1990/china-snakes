(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    /* 清除旧版缓存（曾在 iOS Safari 上导致白屏） */
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
