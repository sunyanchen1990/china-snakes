(function () {
  var d = window.CN_VIPER_DATA;
  var n = d && Array.isArray(d.snakes) ? d.snakes.length : 0;
  var deadly = 0;
  var mild = 0;
  var harmless = 0;
  var provinces = {};
  if (d && Array.isArray(d.snakes)) {
    for (var i = 0; i < d.snakes.length; i++) {
      var cat = d.snakes[i].category;
      if (cat === "剧毒蛇") deadly++;
      else if (cat === "微毒蛇") mild++;
      else if (cat === "无毒蛇") harmless++;
      var ps = d.snakes[i].provinces;
      if (!ps) continue;
      if (typeof ps === "string") ps = ps.split(/[,，]/);
      if (!Array.isArray(ps)) continue;
      for (var j = 0; j < ps.length; j++) provinces[ps[j]] = true;
    }
  }
  var c = 0;
  for (var k in provinces) if (Object.prototype.hasOwnProperty.call(provinces, k)) c++;
  var elN = document.getElementById("home-n-species");
  var elD = document.getElementById("home-n-deadly");
  var elM = document.getElementById("home-n-mild");
  var elH = document.getElementById("home-n-harmless");
  var elP = document.getElementById("home-n-provinces");
  if (elN) elN.textContent = n ? String(n) : "—";
  if (elD) elD.textContent = deadly ? String(deadly) : "—";
  if (elM) elM.textContent = mild ? String(mild) : "—";
  if (elH) elH.textContent = harmless ? String(harmless) : "—";
  if (elP) elP.textContent = c ? String(c) : "—";

  var offlineEl = document.getElementById("offline-status");
  if (
    offlineEl &&
    "serviceWorker" in navigator &&
    !document.documentElement.classList.contains("is-ios")
  ) {
    offlineEl.hidden = false;
    if (navigator.onLine) {
      offlineEl.textContent =
        "已启用离线缓存：浏览过的页面与图片可在弱网环境下继续使用。";
    } else {
      offlineEl.textContent = "当前处于离线模式，可继续使用已缓存内容。";
    }
    window.addEventListener("online", function () {
      offlineEl.textContent =
        "已恢复网络。浏览过的页面与图片可在弱网环境下继续使用。";
    });
    window.addEventListener("offline", function () {
      offlineEl.textContent = "当前处于离线模式，可继续使用已缓存内容。";
    });
  }

  var trigger = document.getElementById("donate-trigger");
  var modal = document.getElementById("donate-modal");
  var backdrop = document.getElementById("donate-backdrop");
  var closeBtn = document.getElementById("donate-close");
  if (!trigger || !modal) return;

  function openModal() {
    modal.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var cbtn = document.getElementById("donate-close");
    if (cbtn) cbtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    trigger.focus();
  }

  trigger.addEventListener("click", openModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
