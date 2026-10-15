/* Toolkit — Favicon generator.
   Every icon is drawn on a <canvas> right here, favicon.ico and the ZIP are
   packed byte by byte in the page, and nothing is sent anywhere. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var STORE = "tk-favicon-design";                   // design only; never the logo or names
  var LIGHT_TAB = "#ffffff";                         // Chrome's active tab, light and dark
  var DARK_TAB = "#35363a";
  var RADIUS = 0.22;                                 // "Rounded" corner, share of the size
  var MASK_SAFE = 0.6;                               // Android crops to a circle of 80%: keep the logo inside

  var design = {
    mode: "image", font: "Bricolage Grotesque", weight: "800", fg: "#ffffff",
    bg: "#ff5b1f", transparent: false, shape: "rounded", pad: 14,
    darkInvert: true, theme: "#ff5b1f", themeSame: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") Object.assign(design, saved);
  } catch (e) { /* storage blocked: defaults are fine */ }

  var src = null;        // { svg: bool, img, w, h, root (clean <svg>), name } — only in memory
  var steps = {};        // downscaled copies of a big PNG, per target size

  // ---------- Small helpers ----------
  var hexOk = function (v) { return /^#[0-9a-f]{6}$/i.test(v); };
  var save = function () {
    try { localStorage.setItem(STORE, JSON.stringify(design)); } catch (e) { /* ignore */ }
  };
  var val = function (name) { var el = $('[data-in="' + name + '"]'); return el ? el.value : ""; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var rgb = function (hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); };
  var lum = function (c) {
    var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  var ratio = function (a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  var siteName = function () { return val("name").trim() || "My site"; };
  // Phones show ~12–14 characters under an icon: keep whole words
  var shortName = function () {
    var own = val("short").trim(), name = siteName();
    if (own || name.length <= 14) return own || name;
    var out = "";
    name.split(/\s+/).some(function (w) {
      if ((out + " " + w).trim().length > 14) return true;
      out = (out + " " + w).trim();
    });
    return out || name.slice(0, 14);
  };
  var letters = function () { return val("letters").trim(); };
  var isSample = function () { return design.mode === "image" ? !src : !letters(); };
  var hasSvg = function () { return design.mode === "image" && !!src && src.svg; };
  var invertDark = function () { return hasSvg() && design.transparent && design.darkInvert; };
  var fontCss = function (px) {
    var fam = design.font === "system-ui" ? "system-ui, sans-serif" : design.font === "Georgia" ? "Georgia, serif" : '"' + design.font + '", sans-serif';
    return design.weight + " " + px + "px " + fam;
  };

  // ---------- Drawing ----------
  // Side of the square the logo sits in, for a given icon size
  var contentSide = function (size) {
    var s = size * (1 - 2 * design.pad / 100);
    if (!design.transparent && design.shape === "circle") s *= 0.8;   // keep corners inside the circle
    return s;
  };

  var shapePath = function (ctx, size, shape) {
    ctx.beginPath();
    if (shape === "circle") ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    else if (shape === "rounded") {
      var r = size * RADIUS;
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
    } else ctx.rect(0, 0, size, size);
  };

  // A big PNG drawn straight to 16 px looks jagged: halve it step by step first
  var stepped = function (dw, dh) {
    var key = Math.round(dw) + "x" + Math.round(dh);
    if (steps[key]) return steps[key];
    var cur = src.img, cw = src.w, ch = src.h;
    while (cw / 2 >= dw && ch / 2 >= dh) {
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(cw / 2));
      c.height = Math.max(1, Math.round(ch / 2));
      var x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, c.width, c.height);
      cur = c; cw = c.width; ch = c.height;
    }
    steps[key] = cur;
    return cur;
  };

  var drawContent = function (ctx, size, side, invert) {
    var c = size / 2;
    ctx.save();
    if (invert) ctx.filter = "invert(1) hue-rotate(180deg)";
    if (design.mode === "image" && src) {
      var ar = src.w / src.h;
      var dw = ar >= 1 ? side : side * ar;
      var dh = ar >= 1 ? side / ar : side;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src.svg ? src.img : stepped(dw, dh), c - dw / 2, c - dh / 2, dw, dh);
    } else {
      var t = letters() || "G";
      ctx.font = fontCss(100);
      var m = ctx.measureText(t);
      var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      var h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      var px = 100 * Math.min(side / Math.max(w, 1), side / Math.max(h, 1));
      ctx.font = fontCss(px);
      m = ctx.measureText(t);
      ctx.fillStyle = design.fg;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText(t,
        c - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
        c + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    }
    ctx.restore();
  };

  // kind: "icon" (your shape) · "apple" (solid square, iOS rounds it) · "mask" (Android safe zone)
  var render = function (size, kind, opts, target) {
    opts = opts || {};
    var cv = target || document.createElement("canvas");
    cv.width = cv.height = size;
    var ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    var side = contentSide(size);
    if (kind === "icon") {
      if (!design.transparent) { shapePath(ctx, size, design.shape); ctx.fillStyle = design.bg; ctx.fill(); }
    } else {
      ctx.fillStyle = design.bg;
      ctx.fillRect(0, 0, size, size);
      if (design.transparent) side = size * (1 - 2 * Math.max(design.pad, 12) / 100);
      if (kind === "mask") side = Math.min(side, size * MASK_SAFE);
    }
    drawContent(ctx, size, side, opts.invert);
    return cv;
  };

  var dpr = function () { return Math.min(3, window.devicePixelRatio || 1); };
  var paint = function (cv, css, kind, opts) {
    render(Math.round(css * dpr()), kind, opts, cv);
    cv.style.width = cv.style.height = css + "px";
  };

  // ---------- Source: SVG or picture ----------
  var drop = $("[data-drop]");
  var fileIn = $("[data-file]");
  var UPLOAD_ICON = $("[data-thumb]").innerHTML;

  var loadImg = function (url) {
    return new Promise(function (ok, no) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = no;
      im.src = url;
    });
  };

  // Clean the SVG (it can end up on someone's site) and give it a size the browser can draw
  var readSvg = function (text) {
    var doc = new DOMParser().parseFromString(text, "image/svg+xml");
    var root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) throw new Error("bad");
    $$("script, foreignObject", doc).forEach(function (n) { n.remove(); });
    $$("*", doc).concat([root]).forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
      });
    });
    var vb = root.getAttribute("viewBox");
    if (!vb) {
      var w = parseFloat(root.getAttribute("width")), h = parseFloat(root.getAttribute("height"));
      if (!(w > 0 && h > 0)) throw new Error("size");
      vb = "0 0 " + w + " " + h;
      root.setAttribute("viewBox", vb);
    }
    var p = vb.trim().split(/[\s,]+/).map(Number);
    if (!(p[2] > 0 && p[3] > 0)) throw new Error("size");
    ["width", "height", "x", "y"].forEach(function (k) { root.removeAttribute(k); });
    var big = root.cloneNode(true);
    var k = 1024 / Math.max(p[2], p[3]);
    big.setAttribute("width", Math.round(p[2] * k));
    big.setAttribute("height", Math.round(p[3] * k));
    var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(big)], { type: "image/svg+xml" }));
    return loadImg(url).then(function (img) {
      URL.revokeObjectURL(url);
      return { svg: true, img: img, w: p[2], h: p[3], root: root };
    });
  };

  var readFile = function (file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      window.tkToast("Use an SVG, PNG, JPG or WebP image", true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.tkToast("That image is over 5 MB. Try a smaller export", true);
      return;
    }
    var p;
    if (file.type === "image/svg+xml") p = file.text().then(readSvg);
    else {
      var url = URL.createObjectURL(file);
      p = loadImg(url).then(function (img) {
        return { svg: false, img: img, w: img.naturalWidth, h: img.naturalHeight, url: url };
      });
    }
    p.then(function (s) {
      if (src && src.url) URL.revokeObjectURL(src.url);
      s.name = file.name;
      src = s;
      steps = {};
      var thumb = $("[data-thumb]");
      thumb.innerHTML = "";
      var tc = document.createElement("canvas");
      tc.width = tc.height = 80;
      var tx = tc.getContext("2d"), ar = s.w / s.h;
      tx.drawImage(s.img, ar >= 1 ? 0 : 40 - 40 * ar, ar >= 1 ? 40 - 40 / ar : 0, ar >= 1 ? 80 : 80 * ar, ar >= 1 ? 80 / ar : 80);
      thumb.appendChild(tc);
      $("[data-file-name]").textContent = file.name;
      sync();
      schedule();
    }).catch(function (err) {
      window.tkToast(err && err.message === "size" ? "This SVG has no size. Export it again with a viewBox" : "Couldn't read that image", true);
    });
  };

  fileIn.addEventListener("change", function () { readFile(fileIn.files[0]); fileIn.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function () { drop.classList.remove("is-over"); });
  });
  drop.addEventListener("drop", function (e) {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  });
  $("[data-file-remove]").addEventListener("click", function () {
    if (src && src.url) URL.revokeObjectURL(src.url);
    src = null;
    steps = {};
    $("[data-thumb]").innerHTML = UPLOAD_ICON;
    $("[data-file-name]").textContent = "Add your logo";
    sync();
    schedule();
  });

  // ---------- Output files ----------
  var folder = function () {
    var p = val("path").trim() || "/";
    if (!/^https?:\/\//i.test(p) && p.charAt(0) !== "/") p = "/" + p;
    if (p.slice(-1) !== "/") p += "/";
    return p;
  };
  var themeColor = function () { return design.themeSame ? design.bg : design.theme; };

  var headCode = function () {
    var p = esc(folder());
    return [
      '<link rel="icon" href="' + p + 'favicon.ico" sizes="32x32">',
      hasSvg() ? '<link rel="icon" href="' + p + 'icon.svg" type="image/svg+xml">' : null,
      '<link rel="apple-touch-icon" href="' + p + 'apple-touch-icon.png">',
      '<link rel="manifest" href="' + p + 'manifest.webmanifest">',
      '<meta name="theme-color" content="' + themeColor() + '">'
    ].filter(Boolean).join("\n");
  };

  var FILES = function () {
    return [
      ["favicon.ico", "16 · 32 · 48 px, for every browser"],
      hasSvg() ? ["icon.svg", invertDark() ? "sharp at any size, light on dark tabs" : "sharp at any size"] : null,
      ["apple-touch-icon.png", "180 px, iPhone & iPad"],
      ["icon-192.png", "192 px, Android"],
      ["icon-512.png", "512 px, Android & WordPress"],
      ["icon-mask.png", "512 px, Android adaptive"],
      ["manifest.webmanifest", "name, icons, colours"],
      ["how-to-use.txt", "where the files go + this code"]
    ].filter(Boolean);
  };

  var svgFile = function () {
    var S = 512, side = contentSide(S), r2 = function (n) { return Math.round(n * 100) / 100; };
    var ar = src.w / src.h;
    var dw = ar >= 1 ? side : side * ar, dh = ar >= 1 ? side / ar : side;
    var nest = src.root.cloneNode(true);
    nest.setAttribute("x", r2((S - dw) / 2));
    nest.setAttribute("y", r2((S - dh) / 2));
    nest.setAttribute("width", r2(dw));
    nest.setAttribute("height", r2(dh));
    var bg = "";
    if (!design.transparent) {
      bg = design.shape === "circle" ? '<circle cx="256" cy="256" r="256" fill="' + design.bg + '"/>'
        : '<rect width="512" height="512"' + (design.shape === "rounded" ? ' rx="' + r2(S * RADIUS) + '"' : "") + ' fill="' + design.bg + '"/>';
    }
    var style = invertDark() ? "<style>@media (prefers-color-scheme: dark) { .logo { filter: invert(1) hue-rotate(180deg); } }</style>" : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + style + bg +
      '<g class="logo">' + new XMLSerializer().serializeToString(nest) + "</g></svg>\n";
  };

  var pngBytes = function (cv) {
    return new Promise(function (ok, no) {
      cv.toBlob(function (b) { b ? b.arrayBuffer().then(function (a) { ok(new Uint8Array(a)); }) : no(new Error("png")); }, "image/png");
    });
  };

  // favicon.ico = a small header + the PNGs themselves (every browser since IE11 reads these)
  var icoBytes = function () {
    var sizes = [16, 32, 48];
    return Promise.all(sizes.map(function (s) { return pngBytes(render(s, "icon")); })).then(function (pngs) {
      var head = new DataView(new ArrayBuffer(6 + 16 * pngs.length));
      head.setUint16(2, 1, true);
      head.setUint16(4, pngs.length, true);
      var off = head.byteLength;
      pngs.forEach(function (d, i) {
        var o = 6 + 16 * i;
        head.setUint8(o, sizes[i]);
        head.setUint8(o + 1, sizes[i]);
        head.setUint16(o + 4, 1, true);
        head.setUint16(o + 6, 32, true);
        head.setUint32(o + 8, d.length, true);
        head.setUint32(o + 12, off, true);
        off += d.length;
      });
      return new Blob([head].concat(pngs)).arrayBuffer().then(function (a) { return new Uint8Array(a); });
    });
  };

  // A plain ZIP (stored, no compression: PNGs are compressed already)
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  var crc32 = function (b) {
    var c = 0xffffffff;
    for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  var zip = function (files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 0x0800, true);                // names are UTF-8
      h.setUint16(10, time, true);
      h.setUint16(12, date, true);
      h.setUint32(14, crc, true);
      h.setUint32(18, size, true);
      h.setUint32(22, size, true);
      h.setUint16(26, name.length, true);
      parts.push(h, name, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(12, time, true);
      c.setUint16(14, date, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, size, true);
      c.setUint32(24, size, true);
      c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(c, name);
      offset += 30 + name.length + size;
    });
    var cd = central.reduce(function (s, p) { return s + p.byteLength; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, files.length, true);
    e.setUint16(10, files.length, true);
    e.setUint32(12, cd, true);
    e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [e]), { type: "application/zip" });
  };

  var manifest = function () {
    return JSON.stringify({
      name: siteName(),
      short_name: shortName(),
      icons: [
        { src: "icon-192.png", type: "image/png", sizes: "192x192" },
        { src: "icon-512.png", type: "image/png", sizes: "512x512" },
        { src: "icon-mask.png", type: "image/png", sizes: "512x512", purpose: "maskable" }
      ],
      theme_color: themeColor(),
      background_color: design.bg
    }, null, 2) + "\n";
  };

  var readme = function () {
    return [
      "Favicon pack for " + siteName(),
      "Made with the Toolkit favicon generator: https://gglias.github.io/toolkit/favicon/",
      "",
      "1. Upload every file in this folder to " + folder() + " on your site.",
      "2. Paste these lines inside the <head> of every page:",
      "",
      headCode(),
      "",
      "WordPress: Appearance > Customize > Site Identity > Site Icon takes icon-512.png",
      "and WordPress adds the rest itself. Use the lines above only if you add them",
      "through your theme or a header-code plugin, and then leave the Site Icon empty.",
      ""
    ].join("\r\n");
  };

  var slug = function () {
    return siteName().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "site";
  };

  var download = function (blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };

  var enc = function (s) { return new TextEncoder().encode(s); };

  var buildZip = function () {
    var jobs = [
      icoBytes().then(function (d) { return { name: "favicon.ico", data: d }; }),
      pngBytes(render(180, "apple")).then(function (d) { return { name: "apple-touch-icon.png", data: d }; }),
      pngBytes(render(192, "icon")).then(function (d) { return { name: "icon-192.png", data: d }; }),
      pngBytes(render(512, "icon")).then(function (d) { return { name: "icon-512.png", data: d }; }),
      pngBytes(render(512, "mask")).then(function (d) { return { name: "icon-mask.png", data: d }; })
    ];
    return Promise.all(jobs).then(function (files) {
      if (hasSvg()) files.splice(1, 0, { name: "icon.svg", data: enc(svgFile()) });
      files.push({ name: "manifest.webmanifest", data: enc(manifest()) });
      files.push({ name: "how-to-use.txt", data: enc(readme()) });
      return zip(files);
    });
  };

  $$("[data-export]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (isSample()) { window.tkToast(design.mode === "image" ? "Add your logo first" : "Type a letter first", true); return; }
      var kind = b.getAttribute("data-export");
      var job = kind === "zip" ? buildZip().then(function (z) { return [z, "favicon-" + slug() + ".zip"]; })
        : kind === "ico" ? icoBytes().then(function (d) { return [new Blob([d], { type: "image/x-icon" }), "favicon.ico"]; })
        : pngBytes(render(512, "icon")).then(function (d) { return [new Blob([d], { type: "image/png" }), "icon-512.png"]; });
      job.then(function (r) {
        download(r[0], r[1]);
        window.tkToast(r[1] + " downloaded");
      }).catch(function () { window.tkToast("Couldn't create the file", true); });
    });
  });

  $("[data-copy]").addEventListener("click", function () {
    navigator.clipboard.writeText(headCode()).then(function () {
      window.tkToast("Copied. Paste it inside your <head>");
    }).catch(function () { window.tkToast("Your browser blocked the clipboard", true); });
  });

  // ---------- Checks ----------
  var ICONS = {
    ok: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17h.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M12 11v6M12 7h.01"/></svg>',
    wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.2"/></svg>'
  };
  var setCheck = function (id, state, html) {
    var li = $('[data-check="' + id + '"]');
    li.setAttribute("data-state", state);
    $("[data-ic]", li).innerHTML = ICONS[state];
    $("[data-v]", li).innerHTML = html;
  };

  // How well the icon stands out on a tab: contrast of its most visible pixels
  var tabContrast = function (tab, invert) {
    var d = render(32, "icon", { invert: invert }).getContext("2d").getImageData(0, 0, 32, 32).data;
    var T = rgb(tab), Lt = lum(T), list = [];
    for (var i = 0; i < d.length; i += 4) {
      var a = d[i + 3] / 255;
      if (a < 0.15) continue;
      list.push(ratio(lum([0, 1, 2].map(function (k) { return d[i + k] * a + T[k] * (1 - a); })), Lt));
    }
    if (!list.length) return 1;
    list.sort(function (x, y) { return x - y; });
    return list[Math.floor(list.length * 0.85)];
  };

  // Share of the box the picture really fills (logos exported with big margins look tiny)
  var filled = function () {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    var ctx = cv.getContext("2d"), ar = src.w / src.h;
    var dw = ar >= 1 ? 64 : 64 * ar, dh = ar >= 1 ? 64 / ar : 64;
    ctx.drawImage(src.img, (64 - dw) / 2, (64 - dh) / 2, dw, dh);
    var d = ctx.getImageData(0, 0, 64, 64).data, x0 = 64, y0 = 64, x1 = -1, y1 = -1;
    for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
      if (d[(y * 64 + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    return x1 < 0 ? 0 : Math.max(x1 - x0 + 1, y1 - y0 + 1) / 64;
  };

  var tabText = function (r, dark) {
    var n = r.toFixed(1) + ":1";
    if (r >= 3) return ["ok", "Stands out · " + n];
    var fix = design.transparent
      ? (dark && hasSvg() ? "Turn on <b>Invert on dark tabs</b>, or give it a background." : "Give it a background colour.")
      : "Pick a background with more contrast.";
    if (r >= 1.8) return ["warn", "Faint · " + n + "<small>" + fix + "</small>"];
    return ["bad", "Almost invisible · " + n + "<small>" + fix + "</small>"];
  };

  var checks = function () {
    if (isSample()) {
      ["source", "light", "dark", "small"].forEach(function (k) { setCheck(k, "wait", "Waiting for your " + (design.mode === "image" ? "logo" : "letters") + "…"); });
    } else {
      // Source
      if (design.mode === "text") setCheck("source", "ok", "Letters · drawn sharp at every size");
      else if (src.svg) setCheck("source", "ok", "SVG · sharp at every size, also exported as icon.svg");
      else {
        var m = Math.min(src.w, src.h), sz = src.w + " × " + src.h + " px";
        if (m >= 512) setCheck("source", "ok", sz + " · big enough for every size");
        else if (m >= 180) setCheck("source", "warn", sz + "<small>The 512 px icons are enlarged and may look soft. Use 512 px or an SVG.</small>");
        else setCheck("source", "bad", sz + "<small>Too small: phone icons will look blurry. Use 512 px or an SVG.</small>");
      }
      // Tabs
      var l = tabText(tabContrast(LIGHT_TAB, false), false);
      setCheck("light", l[0], l[1]);
      var dk = tabText(tabContrast(DARK_TAB, invertDark()), true);
      setCheck("dark", dk[0], dk[1] + (invertDark() && dk[0] === "ok" ? "<small>Inverted for dark tabs in the SVG (Chrome, Edge, Firefox).</small>" : ""));
      // 16 px
      if (design.mode === "text") {
        var n = letters().length;
        if (n <= 2) setCheck("small", "ok", "Readable · " + n + (n === 1 ? " letter" : " letters"));
        else setCheck("small", "warn", "Three letters get tiny<small>At 16 px, one or two read better.</small>");
      } else {
        var ar = Math.max(src.w / src.h, src.h / src.w), f = filled();
        if (ar > 2) setCheck("small", "warn", "Wide logo<small>At 16 px it shrinks to a thin line. Use just the symbol if you have one.</small>");
        else if (f < 0.72) setCheck("small", "warn", "Lots of empty space in your file<small>The logo fills " + Math.round(f * 100) + "% of its own canvas. Crop it, or set the padding to 0.</small>");
        else setCheck("small", "ok", "Fills the space well");
      }
    }
    setCheck("phones", design.transparent ? "info" : "ok", design.transparent
      ? "Background " + design.bg.toUpperCase() + "<small>Phones don't allow transparency, so iPhone and Android icons get your background colour.</small>"
      : "Solid background · ready for iPhone and Android<small>Android crops to a circle, so its icon gets extra padding.</small>");
  };

  // ---------- Previews ----------
  var raf = 0;
  var update = function () {
    raf = 0;
    var sample = isSample();
    $("[data-canvas]").classList.toggle("is-sample", sample);
    $("[data-big]").classList.toggle("is-transparent", design.transparent);

    var big = $('[data-pv="big"]');
    paint(big, Math.round($("[data-big]").clientWidth) || 200, "icon");
    paint($('[data-pv="tab-light"]'), 16, "icon");
    paint($('[data-pv="tab-dark"]'), 16, "icon", { invert: invertDark() });
    paint($('[data-pv="apple"]'), 60, "apple");
    paint($('[data-pv="mask"]'), 60, "mask");
    paint($('[data-pv="serp"]'), 18, "icon");
    $$("[data-px]").forEach(function (cv) {
      var s = Number(cv.getAttribute("data-px"));
      render(s, "icon", null, cv);
      cv.style.width = cv.style.height = s + "px";
    });

    $$("[data-site-name]").forEach(function (el) { el.textContent = siteName(); });
    $$("[data-short-name]").forEach(function (el) { el.textContent = shortName(); });

    $("[data-code]").textContent = headCode();
    var files = FILES();
    $("[data-file-count]").textContent = files.length + " files in the ZIP";
    $("[data-files]").innerHTML = files.map(function (f) { return "<li><b>" + f[0] + "</b><span>" + f[1] + "</span></li>"; }).join("");

    checks();
  };
  var schedule = function () { if (!raf) raf = requestAnimationFrame(update); };

  // Letters need their web font before they can be drawn
  var withFont = function () {
    var drawsText = design.mode === "text" || !src;   // the sample is a letter too
    if (!drawsText || !document.fonts || /Georgia|system/.test(design.font)) { schedule(); return; }
    document.fonts.load(fontCss(100), letters() || "G").then(schedule, schedule);
  };

  // ---------- Controls ----------
  var press = function (box, value) {
    $$("button[data-value]", box).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === String(value))); });
  };

  var sync = function () {
    press($("[data-mode]"), design.mode);
    press($("[data-weight]"), design.weight);
    press($("[data-shape]"), design.shape);
    $("[data-mode-name]").textContent = design.mode === "image" ? "Logo" : "Letters";
    $$("[data-fields]").forEach(function (el) { el.hidden = el.getAttribute("data-fields") !== design.mode; });
    $('[data-in="font"]').value = design.font;

    ["fg", "bg", "theme"].forEach(function (key) {
      var picker = $('[data-color="' + key + '"]'), hex = $('[data-hex="' + key + '"]');
      picker.value = design[key];
      if (document.activeElement !== hex) hex.value = design[key].toUpperCase();
      $('[data-swatch="' + key + '"]').style.setProperty("--swatch", design[key]);
    });
    $('[data-in-design="transparent"]').checked = !!design.transparent;
    $('[data-in-design="darkInvert"]').checked = !!design.darkInvert;
    $('[data-in-design="themeSame"]').checked = !!design.themeSame;
    $("[data-theme-color]").hidden = !!design.themeSame;
    $("[data-dark-row]").hidden = !(hasSvg() && design.transparent);
    $$("[data-shape] button").forEach(function (b) { b.disabled = !!design.transparent; });

    var pad = $("[data-pad]");
    pad.value = design.pad;
    pad.style.setProperty("--p", (design.pad / 30 * 100) + "%");
    $("[data-pad-out]").textContent = design.pad + "%";

    drop.classList.toggle("has-logo", !!src);
    $("[data-file-remove]").hidden = !src;
  };

  var segs = [["[data-mode]", "mode"], ["[data-weight]", "weight"], ["[data-shape]", "shape"]];
  segs.forEach(function (g) {
    $(g[0]).addEventListener("click", function (e) {
      var b = e.target.closest("button[data-value]");
      if (!b || b.disabled) return;
      design[g[1]] = b.getAttribute("data-value");
      sync();
      save();
      withFont();
    });
  });

  ["fg", "bg", "theme"].forEach(function (key) {
    var picker = $('[data-color="' + key + '"]'), hex = $('[data-hex="' + key + '"]');
    picker.addEventListener("input", function () {
      design[key] = picker.value;
      sync();
      schedule();
    });
    picker.addEventListener("change", save);
    hex.addEventListener("input", function () {
      var v = hex.value.trim();
      if (v.charAt(0) !== "#") v = "#" + v;
      if (/^#[0-9a-f]{3}$/i.test(v)) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      if (hexOk(v)) {
        design[key] = v.toLowerCase();
        picker.value = design[key];
        $('[data-swatch="' + key + '"]').style.setProperty("--swatch", design[key]);
        save();
        schedule();
      }
    });
    hex.addEventListener("blur", function () { hex.value = design[key].toUpperCase(); });
  });

  $$("[data-in-design]").forEach(function (el) {
    el.addEventListener("change", function () {
      design[el.getAttribute("data-in-design")] = el.checked;
      sync();
      save();
      schedule();
    });
  });

  $("[data-pad]").addEventListener("input", function (e) {
    design.pad = Number(e.target.value);
    sync();
    schedule();
  });
  $("[data-pad]").addEventListener("change", save);

  $('[data-in="font"]').addEventListener("change", function (e) {
    design.font = e.target.value;
    save();
    withFont();
  });
  $('[data-in="letters"]').addEventListener("input", withFont);
  ["name", "short", "path"].forEach(function (k) { $('[data-in="' + k + '"]').addEventListener("input", schedule); });

  window.addEventListener("resize", schedule);

  // ---------- Go ----------
  sync();
  update();
  if (document.fonts) document.fonts.ready.then(withFont);
  withFont();
})();
