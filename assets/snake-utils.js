(function (global) {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function findSnakeById(id) {
    var data = global.CN_VIPER_DATA;
    var all = data && Array.isArray(data.snakes) ? data.snakes : [];
    var key = String(id || "").trim();
    if (!key) return null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === key) return all[i];
    }
    return null;
  }

  function speciesUrl(id) {
    return "species.html?id=" + encodeURIComponent(id);
  }

  global.SnakeUtils = {
    esc: esc,
    snakeName: snakeName,
    coerceImages: coerceImages,
    findSnakeById: findSnakeById,
    speciesUrl: speciesUrl,
  };
})(window);
