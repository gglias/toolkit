/* Toolkit — QR code generator.
   Everything happens here in the page: the code is drawn by qr-code-styling,
   read back by jsQR for the scan test, and downloaded straight from memory. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var SIZE = 1000;                                   // preview / SVG size in px
  var SAMPLE = "https://gglias.github.io/toolkit/qr/";
  var STORE = "tk-qr-design";                        // design only; never the content

  var TYPES = { url: "Link", text: "Text", wifi: "Wi-Fi", vcard: "Contact", email: "Email", tel: "Phone", sms: "SMS" };

  var PRESETS = [
    { name: "Classic", d: { dots: "square", dotsColor: "#000000", corner: "square", cornerDot: "square", cornerSame: true, cornerColor: "#000000", bg: "#ffffff", transparent: false } },
    { name: "Rounded", d: { dots: "rounded", dotsColor: "#141414", corner: "extra-rounded", cornerDot: "dot", cornerSame: true, cornerColor: "#141414", bg: "#ffffff", transparent: false } },
    { name: "Ember", d: { dots: "rounded", dotsColor: "#141414", corner: "extra-rounded", cornerDot: "dot", cornerSame: false, cornerColor: "#c4210b", bg: "#ffffff", transparent: false } },
    { name: "Dots", d: { dots: "dots", dotsColor: "#1b1b3a", corner: "dot", cornerDot: "dot", cornerSame: true, cornerColor: "#1b1b3a", bg: "#ffffff", transparent: false } }
  ];

  var DOTS = [
    ["square", "Square"], ["rounded", "Rounded"], ["extra-rounded", "Extra round"],
    ["dots", "Dots"], ["classy", "Classy"], ["classy-rounded", "Classy round"]
  ];
  var CORNERS = [["square", "Square"], ["extra-rounded", "Rounded"], ["dot", "Circle"]];

  var design = Object.assign({ ecc: "Q", quiet: 4, logoSize: 30 }, PRESETS[0].d);   // Classic: square dots, square corners
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") Object.assign(design, saved);
  } catch (e) { /* storage blocked: defaults are fine */ }

  var type = "url";
  var logo = null;        // data URL, only in memory
  var modules = 25;       // module count of the last drawn code
  var current = "";       // the exact text inside the code

  // ---------- Small helpers ----------
  var hexOk = function (v) { return /^#[0-9a-f]{6}$/i.test(v); };
  var save = function () {
    try { localStorage.setItem(STORE, JSON.stringify(design)); } catch (e) { /* ignore */ }
  };
  var utf8 = function (s) { return new TextEncoder().encode(s); };
  // qr-code-styling writes 1 byte per character, so non-Latin text (Greek!) is
  // handed over as UTF-8 bytes, one character per byte.
  var toQR = function (s) {
    if (!/[^\x00-\x7f]/.test(s)) return s;
    var b = utf8(s), out = "";
    for (var i = 0; i < b.length; i++) out += String.fromCharCode(b[i]);
    return out;
  };
  var val = function (name) {
    var el = $('[data-in="' + name + '"]');
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value;
  };

  // ---------- Building the text inside the code ----------
  var wifiEsc = function (s) { return s.replace(/([\\;,:"])/g, "\\$1"); };
  var vEsc = function (s) { return s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n"); };

  var urlNote = "";
  var build = function () {
    urlNote = "";
    switch (type) {
      case "url": {
        var u = val("url").trim();
        if (!u) return "";
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) {
          u = "https://" + u.replace(/^\/+/, "");
          urlNote = "Added <b>https://</b> so phones open it as a link.";
        }
        return u;
      }
      case "text":
        return val("text");
      case "wifi": {
        var ssid = val("ssid");
        if (!ssid) return "";
        var sec = val("sec");
        var s = "WIFI:T:" + sec + ";S:" + wifiEsc(ssid) + ";";
        if (sec !== "nopass") s += "P:" + wifiEsc(val("pass")) + ";";
        if (val("hidden")) s += "H:true;";
        return s + ";";
      }
      case "vcard": {
        var first = val("first").trim(), last = val("last").trim();
        var org = val("org").trim(), title = val("title").trim();
        var phone = val("phone").trim(), mail = val("vemail").trim(), web = val("web").trim();
        if (!(first || last || org || phone || mail || web)) return "";
        var L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + vEsc(last) + ";" + vEsc(first) + ";;;", "FN:" + vEsc((first + " " + last).trim() || org)];
        if (org) L.push("ORG:" + vEsc(org));
        if (title) L.push("TITLE:" + vEsc(title));
        if (phone) L.push("TEL;TYPE=CELL:" + phone);
        if (mail) L.push("EMAIL:" + mail);
        if (web) L.push("URL:" + web);
        L.push("END:VCARD");
        return L.join("\r\n");
      }
      case "email": {
        var to = val("to").trim();
        if (!to) return "";
        var q = [];
        if (val("subject")) q.push("subject=" + encodeURIComponent(val("subject")));
        if (val("body")) q.push("body=" + encodeURIComponent(val("body")));
        return "mailto:" + to + (q.length ? "?" + q.join("&") : "");
      }
      case "tel": {
        var t = val("tel").replace(/[^\d+]/g, "");
        return t ? "tel:" + t : "";
      }
      case "sms": {
        var n = val("smsto").replace(/[^\d+]/g, "");
        if (!n) return "";
        return "SMSTO:" + n + ":" + val("smsbody");
      }
    }
    return "";
  };

  // ---------- Drawing ----------
  var cornerColor = function () { return design.cornerSame ? design.dotsColor : design.cornerColor; };

  var options = function (size, kind, data) {
    var q = Number(design.quiet) || 0;
    return {
      width: size,
      height: size,
      type: kind,
      data: toQR(data),
      margin: q ? Math.round(size * q / (modules + 2 * q)) : 0,
      image: logo || "",
      qrOptions: { typeNumber: 0, errorCorrectionLevel: logo ? "H" : design.ecc },
      imageOptions: { hideBackgroundDots: true, imageSize: design.logoSize / 100, margin: Math.round(size * 0.01), crossOrigin: "anonymous", saveAsBlob: true },
      dotsOptions: { type: design.dots, color: design.dotsColor },
      cornersSquareOptions: { type: design.corner, color: cornerColor() },
      cornersDotOptions: { type: design.cornerDot, color: cornerColor() },
      backgroundOptions: { color: design.transparent ? "transparent" : design.bg }
    };
  };

  var out = $("[data-out]");
  var qr = new QRCodeStyling(options(SIZE, "svg", SAMPLE));
  qr.append(out);

  var frame = $("[data-frame]");
  var canvas = $("[data-canvas]");
  var sizeTag = $("[data-size]");

  var drawRaf = 0;
  var schedule = function () {
    if (drawRaf) return;
    drawRaf = requestAnimationFrame(function () { drawRaf = 0; draw(); });
  };

  var draw = function () {
    var data = build();
    var sample = !data;
    current = data;
    var shown = sample ? SAMPLE : data;

    // The quiet zone depends on the module count, which depends on the data:
    // draw, read the count, and redraw once if it changed.
    qr.update(options(SIZE, "svg", shown));
    var n = qr._qr && qr._qr.getModuleCount ? qr._qr.getModuleCount() : modules;
    if (n !== modules) {
      modules = n;
      qr.update(options(SIZE, "svg", shown));
    }

    frame.classList.toggle("is-sample", sample);
    canvas.classList.toggle("is-sample", sample);
    frame.classList.toggle("is-transparent", !!design.transparent);
    sizeTag.textContent = modules + " × " + modules + " modules";
    $$("[data-export], [data-copy]").forEach(function (b) { b.disabled = sample; });

    $("[data-type-name]").textContent = TYPES[type];
    var hint = $("[data-url-hint]");
    hint.hidden = !(type === "url" && urlNote);
    hint.innerHTML = urlNote;

    var raw = $("[data-raw]");
    raw.textContent = sample ? "(empty — showing a sample)" : data;
    $("[data-raw-count]").textContent = sample ? "" : utf8(data).length + " bytes";

    checks(sample);
    scanSoon(sample ? null : data);
  };

  // ---------- Checks ----------
  var ICONS = {
    ok: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17v.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M12 11v6M12 7v.01"/></svg>',
    wait: '<svg viewBox="0 0 24 24"><path d="M12 6v6l3 2"/></svg>'
  };
  var setCheck = function (name, state, html) {
    var li = $('[data-check="' + name + '"]');
    li.setAttribute("data-state", state);
    $("[data-ic]", li).innerHTML = ICONS[state] || ICONS.info;
    $("[data-v]", li).innerHTML = html;
  };

  var lum = function (hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  var ratio = function (a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  var checks = function (sample) {
    // Contrast
    if (design.transparent) {
      setCheck("contrast", "warn", "Transparent background<small>Place it on a plain, light surface. Busy photos or dark colours behind it can stop it scanning.</small>");
    } else {
      var fg = [design.dotsColor, cornerColor()];
      var worst = Math.min(ratio(fg[0], design.bg), ratio(fg[1], design.bg));
      var inverted = fg.some(function (c) { return lum(c) > lum(design.bg); });
      var r = worst.toFixed(1) + ":1";
      if (inverted) {
        setCheck("contrast", "warn", r + " · inverted<small>Light code on a dark background. New phones read it, some older scanners and apps don't. Dark on light is safest for print.</small>");
      } else if (worst < 3) {
        setCheck("contrast", "bad", r + " · too low<small>Make the dots darker or the background lighter. Aim for at least 4.5:1.</small>");
      } else if (worst < 4.5) {
        setCheck("contrast", "warn", r + " · borderline<small>Usually scans on screens; in print or bad light it may struggle. Aim for 4.5:1 or more.</small>");
      } else {
        setCheck("contrast", "ok", r + " · good");
      }
    }

    // Density
    var version = (modules - 17) / 4;
    var dens = "Version " + version + " · " + modules + " × " + modules + " modules";
    if (sample) setCheck("density", "info", dens + "<small>Sample code.</small>");
    else if (version <= 4) setCheck("density", "ok", dens + " · light");
    else if (version <= 7) setCheck("density", "ok", dens + " · medium<small>Fine for most uses. A shorter link makes it cleaner.</small>");
    else setCheck("density", "warn", dens + " · dense<small>Long content makes tiny dots. Shorten it (a short path on your own domain works well) or print it bigger.</small>");

    // Print size: rule of thumb = distance ÷ 10, bigger for dense codes
    var dist = Number($("[data-distance]").value);
    var cm = Math.max(2, dist / 10) * Math.max(1, modules / 25);
    cm = Math.ceil(cm * 2) / 2;
    $('[data-check="print"]').setAttribute("data-state", "info");
    $('[data-check="print"] [data-ic]').innerHTML = ICONS.info;
    $('[data-check="print"] [data-v]').innerHTML = "At least <b>" + cm.toString().replace(".0", "") + " × " + cm.toString().replace(".0", "") + " cm</b> (" + (cm / 2.54).toFixed(1) + " in)";

    // Error correction
    var lvl = logo ? "H" : design.ecc;
    var pct = { L: "7%", M: "15%", Q: "25%", H: "30%" }[lvl];
    setCheck("ecc", "info", lvl + " · survives up to " + pct + " damage" + (logo ? "<small>Set to H automatically, because the logo covers part of the code.</small>" : ""));
  };

  // ---------- Scan test (jsQR in a Web Worker; main thread only as a fallback) ----------
  var coarse = window.matchMedia("(hover: none)").matches;
  var jsqrLoading = null;
  var loadJsQR = function () {
    if (window.jsQR) return Promise.resolve();
    if (!jsqrLoading) {
      jsqrLoading = new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = "../vendor/jsQR.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    return jsqrLoading;
  };
  var mainDecoder = function () {
    return loadJsQR().then(function () {
      return function (img) {
        var r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
        return Promise.resolve(r ? r.binaryData : null);
      };
    });
  };

  // Resolves to decode(imageData) -> Promise<bytes | null>
  var decoderP = null;
  var getDecoder = function () {
    if (decoderP) return decoderP;
    decoderP = new Promise(function (resolve) {
      var w;
      try { w = new Worker("scan-worker.js"); } catch (e) { resolve(mainDecoder()); return; }
      var seq = 0, waiting = {};
      var giveUp = function () { clearTimeout(timer); w.terminate(); resolve(mainDecoder()); };
      var timer = setTimeout(giveUp, 6000);
      w.onerror = giveUp;
      w.onmessage = function (e) {
        if (e.data.ready) {
          clearTimeout(timer);
          resolve(function (img) {
            return new Promise(function (done) {
              var id = ++seq;
              waiting[id] = done;
              w.postMessage({ id: id, buf: img.data.buffer, w: img.width, h: img.height }, [img.data.buffer]);
            });
          });
          return;
        }
        var cb = waiting[e.data.id];
        delete waiting[e.data.id];
        if (cb) cb(e.data.bytes);
      };
    });
    return decoderP;
  };
  // Warm the worker up while the page is idle, so the first check is instant
  (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(function () { getDecoder(); });

  var scanTimer = 0, scanToken = 0;
  var scanSoon = function (data) {
    clearTimeout(scanTimer);
    var token = ++scanToken;
    if (data === null) {
      setCheck("scan", "info", "Add your content to test it");
      return;
    }
    setCheck("scan", "wait", "Checking…");
    // Wait for a pause in typing (longer on phones, where typing is slower)
    scanTimer = setTimeout(function () { scan(data, token); }, coarse ? 650 : 350);
  };

  var scan = function (data, token) {
    var px = 420;   // enough for the reader: ≥ 4 px per module up to version 20
    var decode;
    getDecoder().then(function (fn) {
      decode = fn;
      if (token !== scanToken) return;   // undefined = skip (stale), null = not readable
      return new QRCodeStyling(options(px, "canvas", data)).getRawData("png");
    }).then(function (blob) {
      if (blob && token === scanToken) return createImageBitmap(blob);
    }).then(function (bmp) {
      if (!bmp || token !== scanToken) return;
      var pad = 28;   // extra white border, like the paper around a printed code
      var c = document.createElement("canvas");
      c.width = c.height = px + pad * 2;
      var ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, pad, pad, px, px);
      return decode(ctx.getImageData(0, 0, c.width, c.height));
    }).then(function (got) {
      if (got === undefined || token !== scanToken) return;
      if (!got) {
        setCheck("scan", "bad", "Couldn't read it<small>Try more contrast, a smaller logo or a standard quiet zone. Phones are often better than this test, but check with yours before printing.</small>");
        return;
      }
      var want = utf8(data);
      var same = want.length === got.length;
      for (var i = 0; same && i < want.length; i++) if (want[i] !== got[i]) same = false;
      if (same) setCheck("scan", "ok", "Reads back exactly as typed<small>Still, scan it with your phone once before you print.</small>");
      else setCheck("scan", "bad", "Reads, but the content is different<small>Please report this; try the Classic preset meanwhile.</small>");
    }).catch(function () {
      if (token === scanToken) setCheck("scan", "info", "Scan test unavailable in this browser");
    });
  };

  // ---------- Content type switching ----------
  $$("[data-type]").forEach(function (b) {
    b.addEventListener("click", function () {
      type = b.getAttribute("data-type");
      $$("[data-type]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$("[data-fields]").forEach(function (f) { f.hidden = f.getAttribute("data-fields") !== type; });
      var first = $('[data-fields="' + type + '"] .input, [data-fields="' + type + '"] .textarea');
      if (first && window.matchMedia("(pointer: fine)").matches) first.focus();
      draw();
    });
  });
  $$("[data-in]").forEach(function (el) {
    el.addEventListener("input", schedule);
    el.addEventListener("change", schedule);
  });
  $("[data-reveal]").addEventListener("click", function () {
    var p = $('[data-in="pass"]');
    var show = p.type === "password";
    p.type = show ? "text" : "password";
    this.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
  $("[data-distance]").addEventListener("change", function () { checks(!current); });

  // ---------- Design controls ----------
  var shape = function (kind, x, y, s) {
    var r = { square: 0, rounded: s * 0.28, "extra-rounded": s * 0.45 }[kind];
    if (kind === "dots") return '<circle cx="' + (x + s / 2) + '" cy="' + (y + s / 2) + '" r="' + (s * 0.42) + '"/>';
    if (kind === "classy" || kind === "classy-rounded") {
      // A leaf: two opposite corners fully round, the other two sharp (or slightly round)
      var k = s * 0.55, m = kind === "classy" ? 0 : s * 0.18;
      var d = ["M", x + k, y, "H", x + s - m];
      if (m) d.push("Q", x + s, y, x + s, y + m);
      d.push("V", y + s - k, "A", k, k, 0, 0, 1, x + s - k, y + s, "H", x + m);
      if (m) d.push("Q", x, y + s, x, y + s - m);
      d.push("V", y + k, "A", k, k, 0, 0, 1, x + k, y, "Z");
      return '<path d="' + d.join(" ") + '"/>';
    }
    return '<rect x="' + (x + 0.5) + '" y="' + (y + 0.5) + '" width="' + (s - 1) + '" height="' + (s - 1) + '" rx="' + r + '"/>';
  };
  var dotPreview = function (kind) {
    var cells = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [2, 2]];
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + cells.map(function (c) { return shape(kind, c[0] * 8, c[1] * 8, 8); }).join("") + "</svg>";
  };
  var cornerPreview = function (kind) {
    var ring = kind === "dot"
      ? '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/>'
      : '<rect x="3" y="3" width="18" height="18" rx="' + (kind === "square" ? 0 : 6) + '" fill="none" stroke="currentColor" stroke-width="3"/>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ring + '<rect x="8.5" y="8.5" width="7" height="7" rx="' + (kind === "dot" ? 3.5 : kind === "square" ? 0 : 2) + '"/></svg>';
  };

  var dotsBox = $("[data-dots]");
  dotsBox.innerHTML = DOTS.map(function (d) {
    return '<button type="button" data-value="' + d[0] + '" aria-pressed="false">' + dotPreview(d[0]) + d[1] + "</button>";
  }).join("");
  var cornersBox = $("[data-corners]");
  cornersBox.innerHTML = CORNERS.map(function (d) {
    return '<button type="button" data-value="' + d[0] + '" aria-pressed="false">' + cornerPreview(d[0]) + d[1] + "</button>";
  }).join("");

  var presetsBox = $("[data-presets]");
  presetsBox.innerHTML = PRESETS.map(function (p, i) {
    var d = p.d;
    var r = d.corner === "dot" ? "50%" : d.corner === "extra-rounded" ? "5px" : "0";
    var r2 = d.cornerDot === "dot" ? "50%" : "0";
    return '<button type="button" data-preset="' + i + '"><i style="--bg-c:' + d.bg + ";--c-c:" + (d.cornerSame ? d.dotsColor : d.cornerColor) + ";--fg-c:" + d.dotsColor + ";--r:" + r + ";--r2:" + r2 + '"></i>' + p.name + "</button>";
  }).join("");

  // Pressed states for the button groups
  var groups = [
    [dotsBox, "dots"], [cornersBox, "corner"], [$("[data-corner-dot]"), "cornerDot"],
    [$("[data-ecc]"), "ecc"], [$("[data-quiet]"), "quiet"]
  ];
  groups.forEach(function (g) {
    g[0].addEventListener("click", function (e) {
      var b = e.target.closest("button[data-value]");
      if (!b || b.disabled) return;
      var v = b.getAttribute("data-value");
      design[g[1]] = g[1] === "quiet" ? Number(v) : v;
      sync();
      save();
      schedule();
    });
  });

  presetsBox.addEventListener("click", function (e) {
    var b = e.target.closest("[data-preset]");
    if (!b) return;
    Object.assign(design, PRESETS[Number(b.getAttribute("data-preset"))].d);
    sync();
    save();
    schedule();
  });

  // Colours: swatch + hex field stay in step
  ["dotsColor", "cornerColor", "bg"].forEach(function (key) {
    var picker = $('[data-color="' + key + '"]');
    var hex = $('[data-hex="' + key + '"]');
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
        heads();
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

  // ---------- Logo ----------
  var drop = $("[data-drop]");
  var fileIn = $("[data-logo]");
  var sizeIn = $("[data-logo-size]");

  var readLogo = function (file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      window.tkToast("Use a PNG, JPG, SVG or WebP image", true);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      window.tkToast("That image is over 3 MB. A smaller logo works better", true);
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      logo = fr.result;
      $("[data-logo-thumb]").innerHTML = '<img alt="" src="' + logo + '" />';
      $("[data-logo-name]").textContent = file.name;
      sync();
      draw();
    };
    fr.readAsDataURL(file);
  };
  fileIn.addEventListener("change", function () { readLogo(fileIn.files[0]); fileIn.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function () { drop.classList.remove("is-over"); });
  });
  drop.addEventListener("drop", function (e) {
    e.preventDefault();
    readLogo(e.dataTransfer.files[0]);
  });
  $("[data-logo-remove]").addEventListener("click", function () {
    logo = null;
    $("[data-logo-thumb]").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5V5M7.5 9.5 12 5l4.5 4.5M5 15v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-3"/></svg>';
    $("[data-logo-name]").textContent = "Add a logo";
    sync();
    draw();
  });
  sizeIn.addEventListener("input", function () {
    design.logoSize = Number(sizeIn.value);
    sync();
    schedule();
  });
  sizeIn.addEventListener("change", save);

  // ---------- Reflect state in the controls ----------
  var press = function (box, value) {
    $$("button[data-value]", box).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === String(value))); });
  };
  var sync = function () {
    press(dotsBox, design.dots);
    press(cornersBox, design.corner);
    press($("[data-corner-dot]"), design.cornerDot);
    press($("[data-ecc]"), logo ? "H" : design.ecc);
    press($("[data-quiet]"), design.quiet);
    $$("[data-ecc] button").forEach(function (b) { b.disabled = !!logo && b.getAttribute("data-value") !== "H"; });

    ["dotsColor", "cornerColor", "bg"].forEach(function (key) {
      var picker = $('[data-color="' + key + '"]');
      var hex = $('[data-hex="' + key + '"]');
      picker.value = design[key];
      if (document.activeElement !== hex) hex.value = design[key].toUpperCase();
      $('[data-swatch="' + key + '"]').style.setProperty("--swatch", design[key]);
    });
    $('[data-in-design="cornerSame"]').checked = !!design.cornerSame;
    $('[data-in-design="transparent"]').checked = !!design.transparent;
    $("[data-corner-color]").hidden = !!design.cornerSame;
    $('[data-swatch="bg"]').classList.toggle("is-transparent", !!design.transparent);
    $('[data-hex="bg"]').disabled = !!design.transparent;
    $('[data-color="bg"]').disabled = !!design.transparent;

    drop.classList.toggle("has-logo", !!logo);
    $("[data-logo-remove]").hidden = !logo;
    sizeIn.disabled = !logo;
    sizeIn.value = design.logoSize;
    sizeIn.style.setProperty("--p", ((design.logoSize - 15) / 25 * 100) + "%");
    $("[data-logo-size-out]").textContent = design.logoSize + "%";
    heads();
  };

  // What each folded group is set to (colours are always checked #hex)
  var label = function (list, v) { var f = list.filter(function (x) { return x[0] === v; })[0]; return f ? f[1] : v; };
  var chip = function (c, round) { return '<i class="' + (round ? "is-circle" : "") + '" style="--chip:' + c + '"></i>'; };
  var heads = function () {
    var keys = Object.keys(PRESETS[0].d);
    var match = -1;
    PRESETS.forEach(function (p, i) {
      if (match < 0 && keys.every(function (k) { return k === "cornerColor" && p.d.cornerSame && design.cornerSame ? true : p.d[k] === design[k]; })) match = i;
    });
    $$("[data-preset]").forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === match)); });
    $('[data-acc="presets"]').textContent = match < 0 ? "Custom" : PRESETS[match].name;
    $('[data-acc="dots"]').innerHTML = chip(design.dotsColor, design.dots === "dots") + label(DOTS, design.dots) + " · " + design.dotsColor.toUpperCase();
    $('[data-acc="corners"]').innerHTML = (design.cornerSame ? "" : chip(design.cornerColor, design.corner === "dot")) +
      label(CORNERS, design.corner) + " · " + (design.cornerDot === "dot" ? "round" : "square") + " centre";
    $('[data-acc="bg"]').innerHTML = design.transparent ? '<i class="is-none"></i>Transparent' : chip(design.bg) + design.bg.toUpperCase();
    $('[data-acc="logo"]').textContent = logo ? $("[data-logo-name]").textContent : "None";
    $('[data-acc="scan"]').textContent = "ECC " + (logo ? "H" : design.ecc) + " · " + { 0: "No border", 2: "Small", 4: "Standard" }[design.quiet];
  };

  // ---------- Export ----------
  var fileBase = function () {
    var base = "";
    if (type === "url") {
      try { var u = new URL(current); base = u.hostname.replace(/^www\./, "") + u.pathname; } catch (e) { base = "link"; }
    } else if (type === "wifi") base = "wifi-" + val("ssid");
    else if (type === "vcard") base = (val("first") + " " + val("last")).trim() || val("org") || "contact";
    else base = type;
    base = base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    return "qr-" + (base || type);
  };

  var save$ = function (blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };

  var pngBlob = function () {
    var px = Number($("[data-png-size]").value) || 1024;
    return new QRCodeStyling(options(px, "canvas", current)).getRawData("png");
  };

  $$("[data-export]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!current) return;
      var kind = b.getAttribute("data-export");
      var p = kind === "svg" ? qr.getRawData("svg") : pngBlob();
      p.then(function (blob) {
        save$(blob, fileBase() + "." + kind);
        window.tkToast(kind === "svg" ? "SVG downloaded" : "PNG downloaded");
      }).catch(function () { window.tkToast("Couldn't create the file", true); });
    });
  });

  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!current) return;
      var kind = b.getAttribute("data-copy");
      if (kind === "svg") {
        qr.getRawData("svg").then(function (blob) { return blob.text(); }).then(function (text) {
          return navigator.clipboard.writeText(text);
        }).then(function () {
          window.tkToast("Copied. Paste it into Figma as vector");
        }).catch(function () { window.tkToast("Your browser blocked the clipboard", true); });
      } else {
        if (!window.ClipboardItem) { window.tkToast("Your browser can't copy images. Download the PNG instead", true); return; }
        navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]).then(function () {
          window.tkToast("PNG copied");
        }).catch(function () { window.tkToast("Your browser blocked the clipboard", true); });
      }
    });
  });

  // ---------- Go ----------
  sync();
  draw();
})();
