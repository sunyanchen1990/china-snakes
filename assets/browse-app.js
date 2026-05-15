(function () {
  var data = window.CN_VIPER_DATA;
  var all = data && Array.isArray(data.snakes) ? data.snakes : [];

  try {
    var sp = new URLSearchParams(window.location.search).get("species");
    if (sp && sp.trim()) {
      window.location.replace(
        "species.html?id=" + encodeURIComponent(sp.trim())
      );
      return;
    }
  } catch (eRedirect) {}

  /** 第一个搜索框 datalist：标准省级行政区全称（顺序固定） */
  var PROVINCE_OPTIONS = [
    "北京市",
    "天津市",
    "河北省",
    "山西省",
    "内蒙古自治区",
    "辽宁省",
    "吉林省",
    "黑龙江省",
    "上海市",
    "江苏省",
    "浙江省",
    "安徽省",
    "福建省",
    "江西省",
    "山东省",
    "河南省",
    "湖北省",
    "湖南省",
    "广东省",
    "广西壮族自治区",
    "海南省",
    "重庆市",
    "四川省",
    "贵州省",
    "云南省",
    "西藏自治区",
    "陕西省",
    "甘肃省",
    "青海省",
    "宁夏回族自治区",
    "新疆维吾尔自治区",
    "台湾省",
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 省名去后缀，便于「广东」与「广东省」对应 */
  function stripProvinceSuffix(name) {
    var s = String(name || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .replace(/\s/g, "");
    var pats = [
      "维吾尔自治区",
      "壮族自治区",
      "回族自治区",
      "特别行政区",
      "自治区",
      "省",
      "市",
    ];
    for (var i = 0; i < pats.length; i++) {
      var p = pats[i];
      if (s.length >= p.length && s.slice(-p.length) === p) {
        return s.slice(0, -p.length);
      }
    }
    return s;
  }

  function provinceHit(userInput, provinceInData) {
    var a = stripProvinceSuffix(userInput);
    var b = stripProvinceSuffix(provinceInData);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
    return false;
  }

  function snakeInProvince(snake, userInput) {
    var arr = snake.provinces;
    if (!arr) return false;
    if (typeof arr === "string") {
      arr = arr.split(/[,，;；]/).map(function (x) {
        return x.trim();
      }).filter(Boolean);
    }
    if (!Array.isArray(arr)) return false;
    for (var i = 0; i < arr.length; i++) {
      if (provinceHit(userInput, arr[i])) return true;
    }
    return false;
  }

  function snakeName(snake) {
    return String((snake && (snake.cnName || snake.name)) || "");
  }

  function coerceImages(snake) {
    var out = [];
    var im = snake && snake.images;
    if (typeof im === "string") {
      try {
        im = JSON.parse(im);
      } catch (e0) {
        im = im.trim() ? [im.trim()] : [];
      }
    }
    if (Array.isArray(im)) {
      for (var i = 0; i < im.length; i++) {
        var item = im[i];
        if (typeof item === "string" && item.trim()) {
          out.push({ src: item.trim(), label: "" });
        } else if (item && item.img) {
          out.push({ src: item.img, label: item.desc || "" });
        }
      }
    }
    if (!out.length && snake && snake.cover) {
      out.push({ src: snake.cover, label: "" });
    }
    return out;
  }

  /** 名称筛选：空格分段，各段须在中文名中连续出现 */
  function keywordMatch(snake, rawKw) {
    var kw = String(rawKw || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
    if (!kw) return true;
    var name = snakeName(snake);
    var parts = kw.split(/\s+/).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (name.indexOf(parts[i]) === -1) return false;
    }
    return true;
  }

  var form = document.getElementById("f-search");
  var provEl = document.getElementById("f-province");
  var kwEl = document.getElementById("f-keyword");
  var statusEl = document.getElementById("f-status");
  var listEl = document.getElementById("f-list");

  var datalist = document.getElementById("f-province-list");
  if (datalist) {
    datalist.innerHTML = PROVINCE_OPTIONS.map(function (n) {
      return "<option value=\"" + esc(n) + "\"></option>";
    }).join("");
  }

  if (!all.length) {
    if (statusEl) statusEl.textContent = "暂无物种资料。";
    if (listEl) listEl.innerHTML = "";
    return;
  }

  function syncSearchUrl() {
    try {
      var u = new URL(window.location.href);
      var pv = (provEl && provEl.value.trim()) || "";
      var qv = (kwEl && kwEl.value.trim()) || "";
      if (pv) u.searchParams.set("province", pv);
      else u.searchParams.delete("province");
      if (qv) u.searchParams.set("q", qv);
      else u.searchParams.delete("q");
      history.replaceState(null, "", u);
    } catch (e) {}
  }

  function renderCard(snake, idx) {
    var images = coerceImages(snake);
    var gid = "g" + (snake.id || idx);
    var name = snakeName(snake);
    var main = images[0] && images[0].src;
    var photoHtml = main
      ? '<div class="card__photo" data-main="' +
        esc(gid) +
        '"><img src="' +
        esc(main) +
        '" alt="' +
        esc(name) +
        ' 配图" loading="lazy" decoding="async"/></div>'
      : '<div class="card__photo"><div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.8rem;">无图</div></div>';

    var thumbs =
      images.length > 1
        ? '<div class="thumbs" data-thumbs="' +
          esc(gid) +
          '">' +
          images
            .map(function (item, i) {
              return (
                '<button type="button" class="snake-thumb' +
                (i === 0 ? " is-on" : "") +
                '" data-gid="' +
                esc(gid) +
                '" data-src="' +
                esc(item.src) +
                '" title="' +
                esc(item.label || "") +
                '"><img src="' +
                esc(item.src) +
                '" alt="' +
                esc(item.label || "") +
                '" loading="lazy"/></button>'
              );
            })
            .join("") +
          "</div>"
        : "";

    var tags = (snake.provinces || [])
      .map(function (p) {
        return "<span>" + esc(p) + "</span>";
      })
      .join("");

    var metaBits = [];
    if (snake.category) metaBits.push(snake.category);
    if (snake.toxicity) metaBits.push(snake.toxicity);
    if (snake.teeth) metaBits.push(snake.teeth);

    return (
      '<article class="card" data-snake-card data-snake-id="' +
      esc(snake.id || "") +
      '" data-snake-name="' +
      esc(name) +
      '">' +
      '<div class="card__top">' +
      photoHtml +
      '<div class="card__title"><h2><a class="card__link" href="species.html?id=' +
      esc(snake.id || "") +
      '">' +
      esc(name) +
      '</a></h2><p class="sci">' +
      esc(snake.sciName || snake.scientificName || "") +
      (snake.enName
        ? '</p><p class="en">' + esc(snake.enName) + "</p>"
        : "</p>") +
      (metaBits.length
        ? '<p class="meta-line">' +
          metaBits
            .map(function (b) {
              return "<span>" + esc(b) + "</span>";
            })
            .join("") +
          "</p>"
        : "") +
      '<div class="tags">' +
      tags +
      "</div></div></div>" +
      thumbs +
      '<div class="card__body">' +
      sec("毒液主要成分", snake.toxicityComponent, false) +
      sec("咬伤特征", snake.bite, true) +
      sec("习性", snake.habit, false) +
      sec("猎物", snake.diet, false) +
      sec("体形", snake.size, false) +
      secDist(snake) +
      "</div></article>"
    );
  }

  function sec(title, body, risk) {
    if (!body) return "";
    return (
      '<div class="block' +
      (risk ? " block--risk" : "") +
      '"><h3>' +
      esc(title) +
      "</h3><p>" +
      esc(body) +
      "</p></div>"
    );
  }


  function secDist(snake) {
    if (!snake.distribution && !(snake.provinces && snake.provinces.length))
      return "";
    var map = "";
    if (snake.provinces && snake.provinces.length) {
      map =
        '<div class="dist-chart" data-dist-chart data-provinces="' +
        esc(JSON.stringify(snake.provinces)) +
        '" role="img" aria-label="' +
        esc(snakeName(snake)) +
        ' 分布地图"></div>';
    }
    return (
      '<div class="block block--dist"><h3>分布范围</h3><p>' +
      esc(snake.distribution || "") +
      "</p>" +
      map +
      "</div>"
    );
  }

  function runFilter() {
    var p = (provEl && provEl.value) || "";
    p = p.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    var kwRaw = (kwEl && kwEl.value) || "";
    var kwTrim = String(kwRaw)
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    if (!p && !kwTrim) {
      if (statusEl) statusEl.textContent = "";
      if (listEl) listEl.innerHTML = "";
      if (window.DistMap) window.DistMap.dispose();
      return;
    }

    var base = [];
    if (p) {
      for (var i = 0; i < all.length; i++) {
        if (snakeInProvince(all[i], p)) base.push(all[i]);
      }
    } else {
      for (var bi = 0; bi < all.length; bi++) base.push(all[bi]);
    }

    var rows = [];
    for (var j = 0; j < base.length; j++) {
      if (keywordMatch(base[j], kwTrim)) rows.push(base[j]);
    }

    if (statusEl) {
      if (p) {
        statusEl.innerHTML =
          "省份：<strong>" +
          esc(p) +
          "</strong> · 显示 <strong>" +
          rows.length +
          "</strong> / " +
          base.length +
          " 条（按名称筛选后）";
      } else {
        statusEl.innerHTML =
          "全国 · 仅按名称 · 显示 <strong>" +
          rows.length +
          "</strong> / " +
          all.length +
          " 条";
      }
    }

    if (!rows.length) {
      var msg;
      if (p && base.length === 0) {
        msg =
          "当前省份下暂无收录，可尝试「广东省」等全称或简称。";
      } else if (p) {
        msg = "当前名称条件过严，请清空第二框或换名称中的连续片段再试。";
      } else {
        msg =
          "没有匹配该名称的物种，请换关键词；多个词用空格表示名称中需同时包含。";
      }
      if (listEl)
        listEl.innerHTML =
          '<div class="empty"><b>没有可展示条目</b>' + msg + "</div>";
      if (window.DistMap) window.DistMap.dispose();
      return;
    }

    if (listEl) {
      listEl.innerHTML = rows
        .map(function (s, idx) {
          return renderCard(s, idx);
        })
        .join("");
      if (window.DistMap) window.DistMap.init(listEl);
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runFilter();
      syncSearchUrl();
    });
  }
  if (kwEl) {
    kwEl.addEventListener("input", function () {
      runFilter();
      syncSearchUrl();
    });
    kwEl.addEventListener("change", function () {
      runFilter();
      syncSearchUrl();
    });
    kwEl.addEventListener("compositionend", function () {
      runFilter();
      syncSearchUrl();
    });
  }
  if (provEl) {
    provEl.addEventListener("input", function () {
      runFilter();
      syncSearchUrl();
    });
    provEl.addEventListener("change", function () {
      runFilter();
      syncSearchUrl();
    });
  }

  var hoverZoomEl = document.getElementById("browse-hover-zoom");
  var hoverZoomImgEl = hoverZoomEl && hoverZoomEl.querySelector("img");
  var lbEl = document.getElementById("browse-lightbox");
  var lbImgEl = lbEl && lbEl.querySelector(".browse-lightbox__img");
  var lbBackdropEl = lbEl && lbEl.querySelector(".browse-lightbox__backdrop");
  var lbCloseEl = lbEl && lbEl.querySelector(".browse-lightbox__close");

  var useHoverZoom = false;
  try {
    useHoverZoom = window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches;
  } catch (e3) {}

  var hoverHideTimer = null;
  var hoverThumbBtn = null;

  function clearHoverHideTimer() {
    if (hoverHideTimer) {
      clearTimeout(hoverHideTimer);
      hoverHideTimer = null;
    }
  }

  function hideHoverZoom() {
    clearHoverHideTimer();
    hoverThumbBtn = null;
    if (!hoverZoomEl) return;
    hoverZoomEl.classList.remove("is-on");
    hoverZoomEl.setAttribute("aria-hidden", "true");
    if (hoverZoomImgEl) hoverZoomImgEl.removeAttribute("src");
  }

  function positionHoverPreview(btn, panelEl) {
    if (!btn || !panelEl) return;
    var rect = btn.getBoundingClientRect();
    var w = panelEl.offsetWidth || 280;
    var h = panelEl.offsetHeight || 200;
    var left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = rect.bottom + 10;
    if (top + h > window.innerHeight - 12) {
      top = rect.top - h - 10;
    }
    if (top < 8) top = 8;
    panelEl.style.left = left + "px";
    panelEl.style.top = top + "px";
  }

  function showHoverZoom(btn, src) {
    if (!hoverZoomEl || !hoverZoomImgEl || !src) return;
    hoverThumbBtn = btn;
    hoverZoomImgEl.onload = function () {
      if (hoverThumbBtn === btn) positionHoverPreview(btn, hoverZoomEl);
    };
    hoverZoomImgEl.src = src;
    var card = btn.closest("[data-snake-card]");
    var nm = card && card.getAttribute("data-snake-name");
    hoverZoomImgEl.alt = (nm || "") + " 配图（预览）";
    hoverZoomEl.classList.add("is-on");
    hoverZoomEl.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      if (hoverThumbBtn === btn) positionHoverPreview(btn, hoverZoomEl);
    });
  }

  function openLightbox(src, alt) {
    if (!lbEl || !lbImgEl || !src) return;
    lbImgEl.src = src;
    lbImgEl.alt = alt || "配图预览";
    lbEl.hidden = false;
    document.body.style.overflow = "hidden";
    if (lbCloseEl) lbCloseEl.focus();
  }

  function closeLightbox() {
    if (!lbEl || lbEl.hidden) return;
    lbEl.hidden = true;
    document.body.style.overflow = "";
    if (lbImgEl) lbImgEl.removeAttribute("src");
  }

  if (lbBackdropEl) lbBackdropEl.addEventListener("click", closeLightbox);
  if (lbCloseEl) lbCloseEl.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && lbEl && !lbEl.hidden) closeLightbox();
  });

  if (useHoverZoom && hoverZoomEl) {
    hoverZoomEl.addEventListener("mouseenter", clearHoverHideTimer);
    hoverZoomEl.addEventListener("mouseleave", hideHoverZoom);
  }

  if (useHoverZoom && listEl && hoverZoomEl) {
    listEl.addEventListener("mouseover", function (e) {
      var btn = e.target.closest(".snake-thumb");
      if (!btn || !listEl.contains(btn)) return;
      clearHoverHideTimer();
      var src = btn.getAttribute("data-src");
      if (!src) return;
      showHoverZoom(btn, src);
    });
    listEl.addEventListener("mouseout", function (e) {
      var btn = e.target.closest(".snake-thumb");
      if (!btn || !listEl.contains(btn)) return;
      var rel = e.relatedTarget;
      if (rel && btn.contains(rel)) return;
      if (rel && hoverZoomEl.contains(rel)) return;
      hoverHideTimer = setTimeout(hideHoverZoom, 100);
    });
    window.addEventListener(
      "scroll",
      hideHoverZoom,
      true
    );
    window.addEventListener("resize", hideHoverZoom);
  }

  /* 缩略图：切换主图；非「悬停放大」环境（手机等）点击再打开灯箱 */
  if (listEl) {
    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".snake-thumb");
      if (!btn || !listEl.contains(btn)) return;
      var gid = btn.getAttribute("data-gid");
      var src = btn.getAttribute("data-src");
      var wrap = listEl.querySelector('[data-main="' + gid + '"]');
      if (!wrap) return;
      var img = wrap.querySelector("img");
      if (img && src) img.setAttribute("src", src);
      var row = listEl.querySelector('[data-thumbs="' + gid + '"]');
      if (row) {
        var bs = row.querySelectorAll(".snake-thumb");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("is-on");
      }
      btn.classList.add("is-on");
      if (!useHoverZoom && src) {
        var card = btn.closest("[data-snake-card]");
        var nm = card && card.getAttribute("data-snake-name");
        openLightbox(src, (nm || "") + " 配图");
      }
    });
  }

  try {
    var params = new URLSearchParams(window.location.search);
    var presetP = params.get("province");
    var presetQ = params.get("q");
    if (presetP && provEl) provEl.value = presetP.trim();
    if (presetQ != null && kwEl) kwEl.value = String(presetQ).trim();
    var hasP = provEl && provEl.value.trim();
    var hasQ = kwEl && kwEl.value.trim();
    if ((hasP || hasQ) && (provEl || kwEl)) runFilter();
  } catch (e2) {}
})();
