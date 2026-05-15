(function (global) {
  var GEO_LOCAL = "assets/data/china.geo.json";
  var GEO_CDN =
    "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";
  var registry = [];
  var geoReady = null;
  var mountObserver = null;
  var visibilityObserver = null;
  var animRafId = null;
  var lastAnimAt = 0;
  var TICK_MS = 90;

  function prefersReducedMotion() {
    try {
      return global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function isMobile() {
    try {
      return global.matchMedia("(max-width: 768px)").matches;
    } catch (e) {
      return false;
    }
  }

  function loadGeo() {
    if (!global.echarts) {
      return Promise.reject(new Error("echarts missing"));
    }
    if (!geoReady) {
      geoReady = fetch(GEO_LOCAL)
        .then(function (r) {
          if (!r.ok) throw new Error("local geo missing");
          return r.json();
        })
        .catch(function () {
          return fetch(GEO_CDN).then(function (r) {
            if (!r.ok) throw new Error("geo fetch failed");
            return r.json();
          });
        })
        .then(function (geo) {
          global.echarts.registerMap("china", geo);
          return geo;
        });
    }
    return geoReady;
  }

  function shortProvinceLabel(name) {
    return String(name || "")
      .replace("维吾尔自治区", "")
      .replace("壮族自治区", "")
      .replace("回族自治区", "")
      .replace("特别行政区", "")
      .replace("自治区", "")
      .replace("省", "")
      .replace("市", "");
  }

  var BREATH_PERIOD_MS = 2800;

  function mixByte(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function pulseLabelColor(pulse) {
    return (
      "rgb(" +
      mixByte(0xb8, 0xf0, pulse) +
      "," +
      mixByte(0xdc, 0xff, pulse) +
      "," +
      mixByte(0xc8, 0xf8, pulse) +
      ")"
    );
  }

  function buildSeriesData(provinces, pulse) {
    var alpha = 0.34 + pulse * 0.52;
    var blur = isMobile() ? 4 : 5 + pulse * 10;
    var labelColor = pulseLabelColor(pulse);
    return provinces.map(function (name) {
      return {
        name: name,
        label: {
          show: true,
          formatter: shortProvinceLabel(name),
          color: labelColor,
          fontSize: 10,
          fontWeight: 700,
          textBorderColor: "rgba(5, 9, 8, 0.92)",
          textBorderWidth: 2,
        },
        itemStyle: {
          areaColor: "rgba(62, 207, 142, " + alpha.toFixed(3) + ")",
          borderColor: "#3ecf8e",
          borderWidth: 1.05 + pulse * 0.2,
          shadowColor: "rgba(62, 207, 142, 0.45)",
          shadowBlur: blur,
        },
      };
    });
  }

  function buildOption(provinces, pulse) {
    return {
      backgroundColor: "transparent",
      animation: false,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(14, 24, 20, 0.94)",
        borderColor: "rgba(62, 207, 142, 0.35)",
        textStyle: { color: "#e8f4ef", fontSize: 12 },
        formatter: function (p) {
          return p.name || "";
        },
      },
      series: [
        {
          name: "分布",
          type: "map",
          map: "china",
          roam: false,
          zoom: 1.14,
          top: 10,
          bottom: 6,
          label: { show: false },
          itemStyle: {
            areaColor: "#0b1310",
            borderColor: "rgba(62, 207, 142, 0.2)",
            borderWidth: 0.75,
          },
          emphasis: { disabled: true },
          select: { disabled: true },
          data: buildSeriesData(provinces, pulse),
        },
      ],
    };
  }

  function findItemByEl(el) {
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].el === el) return registry[i];
    }
    return null;
  }

  function hasActiveCharts() {
    for (var i = 0; i < registry.length; i++) {
      var item = registry[i];
      if (item.active && item.chart && !item.chart.isDisposed()) return true;
    }
    return false;
  }

  function stopAnimLoop() {
    if (animRafId) {
      cancelAnimationFrame(animRafId);
      animRafId = null;
    }
  }

  function ensureAnimLoop() {
    if (animRafId || prefersReducedMotion()) return;
    function tick(now) {
      animRafId = requestAnimationFrame(tick);
      if (!hasActiveCharts()) {
        stopAnimLoop();
        return;
      }
      if (now - lastAnimAt < TICK_MS) return;
      lastAnimAt = now;
      for (var i = 0; i < registry.length; i++) {
        var item = registry[i];
        if (!item.active || !item.chart || item.chart.isDisposed()) continue;
        var elapsed = Date.now() - item.startTime;
        var pulse =
          (Math.sin((elapsed / BREATH_PERIOD_MS) * Math.PI * 2) + 1) / 2;
        item.chart.setOption(
          { series: [{ data: buildSeriesData(item.provinces, pulse) }] },
          { lazyUpdate: true, silent: true }
        );
      }
    }
    lastAnimAt = 0;
    animRafId = requestAnimationFrame(tick);
  }

  function ensureVisibilityObserver() {
    if (visibilityObserver || !("IntersectionObserver" in global)) return;
    visibilityObserver = new IntersectionObserver(
      function (entries) {
        var changed = false;
        for (var i = 0; i < entries.length; i++) {
          var item = findItemByEl(entries[i].target);
          if (!item) continue;
          var next = entries[i].isIntersecting;
          if (item.active === next) continue;
          item.active = next;
          changed = true;
          if (next && item.chart && !item.chart.isDisposed()) {
            item.chart.resize();
          }
        }
        if (changed && hasActiveCharts()) ensureAnimLoop();
        else if (!hasActiveCharts()) stopAnimLoop();
      },
      { rootMargin: "0px 0px 80px 0px", threshold: 0.08 }
    );
  }

  function disposeAll() {
    stopAnimLoop();
    if (mountObserver) {
      mountObserver.disconnect();
      mountObserver = null;
    }
    if (visibilityObserver) {
      visibilityObserver.disconnect();
      visibilityObserver = null;
    }
    for (var i = 0; i < registry.length; i++) {
      var item = registry[i];
      if (item.resize) global.removeEventListener("resize", item.resize);
      if (item.chart && !item.chart.isDisposed()) item.chart.dispose();
    }
    registry = [];
  }

  function startChart(el, provinces) {
    var dpr = isMobile() ? 1 : Math.min(global.devicePixelRatio || 1, 2);
    var chart = global.echarts.init(el, null, {
      renderer: "canvas",
      devicePixelRatio: dpr,
    });
    var reduced = prefersReducedMotion();
    var item = {
      chart: chart,
      provinces: provinces,
      startTime: Date.now(),
      active: false,
      el: el,
      resize: null,
    };

    chart.setOption(buildOption(provinces, 0.65));

    function onResize() {
      if (!chart.isDisposed() && item.active) chart.resize();
    }
    item.resize = onResize;
    global.addEventListener("resize", onResize);
    registry.push(item);

    if (!reduced) {
      ensureVisibilityObserver();
      if (visibilityObserver) visibilityObserver.observe(el);
    }
  }

  function init(root) {
    if (!root || !global.echarts) return;

    disposeAll();

    var nodes = root.querySelectorAll("[data-dist-chart]");
    if (!nodes.length) return;

    loadGeo()
      .then(function () {
        function mount(el) {
          if (el.getAttribute("data-dist-mounted") === "1") return;
          var raw = el.getAttribute("data-provinces") || "[]";
          var provinces = [];
          try {
            provinces = JSON.parse(raw);
          } catch (e) {}
          if (!provinces.length) {
            el.classList.add("dist-chart--empty");
            el.textContent = "暂无省级分布数据";
            return;
          }
          el.setAttribute("data-dist-mounted", "1");
          el.textContent = "";
          startChart(el, provinces);
        }

        if ("IntersectionObserver" in global) {
          mountObserver = new IntersectionObserver(
            function (entries) {
              for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                  mount(entries[i].target);
                  mountObserver.unobserve(entries[i].target);
                }
              }
            },
            { rootMargin: "60px 0px", threshold: 0.01 }
          );
          for (var j = 0; j < nodes.length; j++) mountObserver.observe(nodes[j]);
        } else {
          for (var k = 0; k < nodes.length; k++) mount(nodes[k]);
        }
      })
      .catch(function () {
        for (var m = 0; m < nodes.length; m++) {
          nodes[m].classList.add("dist-chart--empty");
          nodes[m].textContent = "地图加载失败，请检查网络";
        }
      });
  }

  global.DistMap = { init: init, dispose: disposeAll };
})(window);
