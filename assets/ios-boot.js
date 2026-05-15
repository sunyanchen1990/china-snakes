/** iPhone/iPad Safari：清除问题缓存并标记，须在页面最早期执行 */
(function () {
  var isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  document.documentElement.classList.add("is-ios");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      if (!regs.length) return;
      return Promise.all(
        regs.map(function (r) {
          return r.unregister();
        })
      ).then(function () {
        if ("caches" in window) {
          return caches.keys().then(function (keys) {
            return Promise.all(
              keys
                .filter(function (k) {
                  return k.indexOf("cn-snake") === 0;
                })
                .map(function (k) {
                  return caches.delete(k);
                })
            );
          });
        }
      }).then(function () {
        if (!sessionStorage.getItem("ios-sw-cleared-v3")) {
          sessionStorage.setItem("ios-sw-cleared-v3", "1");
          location.reload();
        }
      });
    });
  } else if ("caches" in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) {
        if (k.indexOf("cn-snake") === 0) caches.delete(k);
      });
    });
  }
})();
