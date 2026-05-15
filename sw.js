/* eslint-disable no-restricted-globals */
var CACHE = "cn-snake-v1";
var SHELL = [
  "./",
  "./index.html",
  "./browse.html",
  "./species.html",
  "./first-aid.html",
  "./manifest.json",
  "./assets/site.css",
  "./assets/home-app.js",
  "./assets/browse-app.js",
  "./assets/species-app.js",
  "./assets/first-aid-app.js",
  "./assets/snake-utils.js",
  "./assets/dist-map.js",
  "./assets/sw-register.js",
  "./assets/vendor/echarts.min.js",
  "./assets/data/china.geo.json",
  "./data/snakes.data.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

function isImage(url) {
  return /\/assets\/images\//.test(url.pathname);
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isImage(url)) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (res) {
          if (!res || res.status !== 200) return res;
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        if (!res || res.status !== 200) return res;
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(event.request, copy);
        });
        return res;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
