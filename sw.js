/* eslint-disable no-restricted-globals */
var CACHE = "cn-snake-v2";
/** 仅预缓存首屏必需的小文件（避免 iOS Safari 上 addAll 大包超时失败） */
var PRECACHE = [
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
  "./data/snakes.data.js",
  "./assets/icons/icon-192.png",
];

var PRECACHE_LAZY = [
  "./assets/vendor/echarts.min.js",
  "./assets/data/china.geo.json",
];

function precacheOne(cache, url) {
  return cache.add(url).catch(function () {
    return null;
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (u) {
          return precacheOne(cache, u);
        })
      ).then(function () {
        return Promise.all(
          PRECACHE_LAZY.map(function (u) {
            return precacheOne(cache, u);
          })
        );
      });
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
            return k !== CACHE && k.indexOf("cn-snake") === 0;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

function fetchWithTimeout(request, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error("timeout"));
    }, ms);
    fetch(request)
      .then(function (res) {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function isImage(url) {
  return /\/assets\/images\//.test(url.pathname);
}

function putCache(request, response) {
  if (!response || response.status !== 200) return;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) {
    cache.put(request, copy);
  });
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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(event.request, 12000)
        .then(function (res) {
          putCache(event.request, res);
          return res;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return (
              cached ||
              caches.match("./index.html") ||
              new Response("网络不可用，请稍后重试。", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              })
            );
          });
        })
    );
    return;
  }

  if (isImage(url)) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (res) {
          putCache(event.request, res);
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetchWithTimeout(event.request, 15000)
        .then(function (res) {
          putCache(event.request, res);
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
