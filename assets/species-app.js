(function () {
  var U = window.SnakeUtils;
  if (!U) return;

  var root = document.getElementById("species-root");
  var crumb = document.getElementById("crumb-name");
  if (!root) return;

  var id = "";
  try {
    id = new URLSearchParams(window.location.search).get("id") || "";
    id = id.trim();
  } catch (e0) {}

  var snake = U.findSnakeById(id);
  if (!snake) {
    document.title = "未找到物种 · 中国境内蛇类资料速查";
    var msg = !id
      ? "<b>请从检索页选择物种</b>详情页需带 <code>id</code> 参数，例如 <code>species.html?id=snake-001</code>。"
      : "<b>未找到该物种</b>链接可能已失效，请从<a href=\"browse.html\">检索页</a>重新选择。";
    root.innerHTML = '<div class="empty">' + msg + "</div>";
    return;
  }

  var name = U.snakeName(snake);
  document.title = name + " · 中国境内蛇类资料速查";
  if (crumb) crumb.textContent = name;

  var images = U.coerceImages(snake);
  var main = images[0] && images[0].src;
  var metaBits = [];
  if (snake.category) metaBits.push(snake.category);
  if (snake.toxicity) metaBits.push(snake.toxicity);
  if (snake.teeth) metaBits.push(snake.teeth);

  function sec(title, body, risk) {
    if (!body) return "";
    return (
      '<section class="block' +
      (risk ? " block--risk" : "") +
      '"><h3>' +
      U.esc(title) +
      "</h3><p>" +
      U.esc(body) +
      "</p></section>"
    );
  }

  function secList(title, items, risk) {
    if (!items || !items.length) return "";
    var lis = "";
    for (var i = 0; i < items.length; i++) {
      lis += "<li>" + U.esc(items[i]) + "</li>";
    }
    return (
      '<section class="block block--list' +
      (risk ? " block--risk" : "") +
      '"><h3>' +
      U.esc(title) +
      '</h3><ol class="aid-list">' +
      lis +
      "</ol></section>"
    );
  }

  var thumbs =
    images.length > 1
      ? '<div class="species-thumbs">' +
        images
          .map(function (item, i) {
            return (
              '<button type="button" class="snake-thumb species-thumb' +
              (i === 0 ? " is-on" : "") +
              '" data-src="' +
              U.esc(item.src) +
              '" title="' +
              U.esc(item.label || "") +
              '"><img src="' +
              U.esc(item.src) +
              '" alt="' +
              U.esc(item.label || "") +
              '" loading="lazy"/></button>'
            );
          })
          .join("") +
        "</div>"
      : "";

  var map =
    snake.provinces && snake.provinces.length
      ? '<div class="dist-chart" data-dist-chart data-provinces="' +
        U.esc(JSON.stringify(snake.provinces)) +
        '" role="img" aria-label="' +
        U.esc(name) +
        ' 分布地图"></div>'
      : "";

  root.innerHTML =
    '<article class="species-card">' +
    '<header class="species-head">' +
    (main
      ? '<div class="species-photo" id="species-photo"><img src="' +
        U.esc(main) +
        '" alt="' +
        U.esc(name) +
        ' 配图" decoding="async"/></div>'
      : "") +
    '<div class="species-intro">' +
    "<h1>" +
    U.esc(name) +
    "</h1>" +
    '<p class="sci">' +
    U.esc(snake.sciName || "") +
    "</p>" +
    (snake.enName ? '<p class="en">' + U.esc(snake.enName) + "</p>" : "") +
    (metaBits.length
      ? '<p class="meta-line">' +
        metaBits
          .map(function (b) {
            return "<span>" + U.esc(b) + "</span>";
          })
          .join("") +
        "</p>"
      : "") +
  '<div class="tags">' +
    (snake.provinces || [])
      .map(function (p) {
        return "<span>" + U.esc(p) + "</span>";
      })
      .join("") +
    "</div>" +
    '<p class="species-actions"><a class="btn btn-primary" href="first-aid.html">被咬了？急救速查</a></p>' +
    "</div></header>" +
    thumbs +
    '<div class="species-body">' +
    sec("毒液主要成分", snake.toxicityComponent, false) +
    sec("咬伤特征", snake.bite, true) +
    sec("习性", snake.habit, false) +
    sec("猎物", snake.diet, false) +
    sec("体形", snake.size, false) +
    sec("牙型", snake.teeth, false) +
    (snake.distribution || map
      ? '<section class="block block--dist"><h3>分布范围</h3><p>' +
        U.esc(snake.distribution || "") +
        "</p>" +
        map +
        "</section>"
      : "") +
    secList("急救措施", snake.firstAid, true) +
    "</div></article>";

  if (window.DistMap) window.DistMap.init(root);

  var photoEl = document.getElementById("species-photo");
  var lbEl = document.getElementById("browse-lightbox");
  var lbImgEl = lbEl && lbEl.querySelector(".browse-lightbox__img");
  var lbBackdrop = lbEl && lbEl.querySelector(".browse-lightbox__backdrop");
  var lbClose = lbEl && lbEl.querySelector(".browse-lightbox__close");

  function openLb(src, alt) {
    if (!lbEl || !lbImgEl || !src) return;
    lbImgEl.src = src;
    lbImgEl.alt = alt || "";
    lbEl.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    if (!lbEl || lbEl.hidden) return;
    lbEl.hidden = true;
    document.body.style.overflow = "";
    if (lbImgEl) lbImgEl.removeAttribute("src");
  }
  if (lbBackdrop) lbBackdrop.addEventListener("click", closeLb);
  if (lbClose) lbClose.addEventListener("click", closeLb);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && lbEl && !lbEl.hidden) closeLb();
  });

  root.addEventListener("click", function (e) {
    var btn = e.target.closest(".species-thumb");
    if (btn) {
      var src = btn.getAttribute("data-src");
      var img = photoEl && photoEl.querySelector("img");
      if (img && src) img.src = src;
      var all = root.querySelectorAll(".species-thumb");
      for (var i = 0; i < all.length; i++) all[i].classList.remove("is-on");
      btn.classList.add("is-on");
      return;
    }
    if (e.target.closest("#species-photo img")) {
      var mainImg = photoEl && photoEl.querySelector("img");
      if (mainImg && mainImg.src) openLb(mainImg.src, name + " 配图");
    }
  });
})();
