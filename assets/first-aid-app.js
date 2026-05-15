(function () {
  var U = window.SnakeUtils;
  var data = window.CN_VIPER_DATA;
  var grid = document.getElementById("aid-deadly-grid");
  if (!grid || !U || !data) return;

  var deadly = (data.snakes || []).filter(function (s) {
    return s.category === "剧毒蛇";
  });

  deadly.sort(function (a, b) {
    return U.snakeName(a).localeCompare(U.snakeName(b), "zh-CN");
  });

  grid.innerHTML = deadly
    .map(function (s) {
      var name = U.snakeName(s);
      var imgs = U.coerceImages(s);
      var img = s.cover || (imgs[0] && imgs[0].src) || "";
      return (
        '<a class="aid-species" href="' +
        U.speciesUrl(s.id) +
        '">' +
        (img
          ? '<img src="' +
            U.esc(img) +
            '" alt="' +
            U.esc(name) +
            '" loading="lazy" decoding="async"/>'
          : '<span class="aid-species__ph">无图</span>') +
        "<span>" +
        U.esc(name) +
        "</span></a>"
      );
    })
    .join("");

  var tabs = document.querySelectorAll("[data-aid-tab]");
  var panels = document.querySelectorAll("[data-aid-panel]");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      var key = this.getAttribute("data-aid-tab");
      for (var t = 0; t < tabs.length; t++) {
        var on = tabs[t].getAttribute("data-aid-tab") === key;
        tabs[t].classList.toggle("is-on", on);
        tabs[t].setAttribute("aria-selected", on ? "true" : "false");
      }
      for (var p = 0; p < panels.length; p++) {
        var show = panels[p].getAttribute("data-aid-panel") === key;
        panels[p].classList.toggle("is-on", show);
        panels[p].hidden = !show;
      }
    });
  }
})();
