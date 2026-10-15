/* Toolkit — Do not disturb.
   A full-screen sign for a second monitor: message, countdown, and a green
   "Available" when the time is up. Settings live in the page (and in the link
   when you share it); nothing is sent anywhere. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var STORE = "tk-dnd";

  var PRESETS = {
    en: [
      ["🎧", "In focus", "Questions after the timer"],
      ["📞", "On a call", "Wave, don't talk"],
      ["⏳", "Rendering…", "Please wait. So am I."],
      ["🧠", "Deep work", "Brain at 100% CPU"],
      ["🎨", "Pixel pushing", "One more nudge to the left"],
      ["🍰", "Do not disturb", "Unless there's cake"],
      ["🔴", "Recording", "Silence, please"],
      ["☕", "Coffee break", "Back soon. Probably."]
    ],
    el: [
      ["🎧", "Σε συγκέντρωση", "Ερωτήσεις μετά το χρονόμετρο"],
      ["📞", "Σε call", "Κάνε νόημα, μη μιλάς"],
      ["⏳", "Κάνει render…", "Υπομονή. Κάνω κι εγώ."],
      ["🧠", "Βαθιά δουλειά", "Ο εγκέφαλος στο 100%"],
      ["🎨", "Pixel pushing", "Άλλο ένα pixel αριστερά"],
      ["🍰", "Μην ενοχλείτε", "Εκτός αν φέρνετε γλυκό"],
      ["🔴", "Ηχογράφηση", "Ησυχία, παρακαλώ"],
      ["☕", "Διάλειμμα για καφέ", "Επιστρέφω σύντομα. Μάλλον."]
    ]
  };
  var WORDS = {
    en: { kicker: "Do not disturb", until: "until", left: "left", done: "Available", doneSub: "Come say hi 👋", free: "Free", more: "+15 min", imfree: "I'm free", stop: "Stop" },
    el: { kicker: "Μην ενοχλείτε", until: "έως", left: "απομένουν", done: "Ελεύθερα", doneSub: "Πέρασε να τα πούμε 👋", free: "Ελεύθερα", more: "+15 λεπτά", imfree: "Τελείωσα", stop: "Σταμάτα" }
  };
  var THEMES = [
    ["ember", "Ember"], ["onair", "On air"], ["night", "Night"], ["calm", "Calm"], ["paper", "Paper"]
  ];

  var nextHalfHour = function () {
    var d = new Date(Date.now() + 60 * 60000);
    d.setMinutes(d.getMinutes() < 30 ? 30 : 0);
    if (d.getMinutes() === 0) d.setHours(d.getHours() + 1);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  };

  var state = {
    lang: "en", preset: 0, emoji: "🎧", text: "In focus", sub: "Questions after the timer", done: "",
    mode: "until", until: nextHalfHour(), forMin: 50, chime: true,
    theme: "ember", clock: true, bar: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch (e) { /* storage blocked */ }

  // A shared link carries the sign in the #hash
  var KEYS = { e: "emoji", t: "text", s: "sub", d: "done", m: "mode", u: "until", f: "forMin", th: "theme", l: "lang" };
  var fromHash = new URLSearchParams(location.hash.slice(1));
  var showNow = fromHash.get("show") === "1";
  Object.keys(KEYS).forEach(function (k) {
    if (!fromHash.has(k)) return;
    var v = fromHash.get(k).slice(0, 80);
    state[KEYS[k]] = k === "f" ? Math.max(1, Math.min(600, Number(v) || 50)) : v;
    state.preset = -1;
  });
  ["c", "b", "ch"].forEach(function (k, i) { if (fromHash.has(k)) state[["clock", "bar", "chime"][i]] = fromHash.get(k) === "1"; });
  if (!/^\d\d:\d\d$/.test(state.until)) state.until = nextHalfHour();
  if (["until", "for", "none"].indexOf(state.mode) < 0) state.mode = "until";
  if (!THEMES.some(function (t) { return t[0] === state.theme; })) state.theme = "ember";
  if (!PRESETS[state.lang]) state.lang = "en";

  var save = function () { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } };
  var W = function () { return WORDS[state.lang]; };
  var pad = function (n) { return ("0" + n).slice(-2); };
  var hhmm = function (d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  var dur = function (ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return (h ? h + ":" + pad(m) : m) + ":" + pad(s % 60);
  };

  // When the sign ends, for a given start time
  var endFor = function (start) {
    if (state.mode === "none") return null;
    if (state.mode === "for") return start + state.forMin * 60000;
    var p = state.until.split(":"), d = new Date(start);
    d.setHours(Number(p[0]), Number(p[1]), 0, 0);
    return d.getTime();
  };

  // ---------- The sign (built once per screen, then only its texts change) ----------
  var makeSign = function (host) {
    host.innerHTML =
      '<div class="sign">' +
        '<div class="sign-top"><span class="sign-kicker"><i class="sign-dot"></i><span data-k></span></span><span class="sign-clock" data-clock></span></div>' +
        '<div class="sign-main"><span class="sign-emoji" data-emoji></span><p class="sign-text" data-text></p><p class="sign-sub" data-sub></p></div>' +
        '<div class="sign-foot"><span data-until></span><span data-left></span></div>' +
        '<div class="sign-bar"><i data-bar></i></div>' +
      "</div>";
    var el = $(".sign", host);
    return { el: el, k: $("[data-k]", el), clock: $("[data-clock]", el), emoji: $("[data-emoji]", el), text: $("[data-text]", el),
      sub: $("[data-sub]", el), until: $("[data-until]", el), left: $("[data-left]", el), bar: $("[data-bar]", el) };
  };

  var paint = function (s, start, end, now) {
    var done = end !== null && now >= end;
    s.el.setAttribute("data-theme", done ? "done" : state.theme);
    s.el.lang = state.lang;
    s.el.classList.toggle("is-done", done);
    s.el.classList.toggle("no-clock", !state.clock);
    s.el.classList.toggle("no-timer", end === null || done);
    s.el.classList.toggle("no-bar", !state.bar || end === null || done);
    s.k.textContent = done ? W().free : W().kicker;
    s.clock.textContent = hhmm(new Date(now));
    s.emoji.textContent = done ? "✅" : state.emoji;
    s.emoji.hidden = !(done || state.emoji);
    s.text.textContent = done ? (state.done || W().done) : (state.text || W().kicker);
    s.sub.textContent = done ? W().doneSub : state.sub;
    s.sub.hidden = !(done || state.sub);
    if (end !== null && !done) {
      s.until.textContent = W().until + " " + hhmm(new Date(end));
      s.left.textContent = state.lang === "el" ? W().left + " " + dur(end - now) : dur(end - now) + " " + W().left;
      s.bar.style.width = Math.min(100, Math.max(0, (now - start) / Math.max(1, end - start) * 100)) + "%";
    }
    // fit long words: shrink the big text a little per extra character
    var len = s.text.textContent.length;
    s.el.style.setProperty("--fit", len > 14 ? Math.max(0.5, 14 / len).toFixed(3) : "1");
    return done;
  };

  // ---------- Preview ----------
  var preview = makeSign($("[data-preview]"));
  var pageStart = Date.now();
  var drawPreview = function () {
    var now = Date.now(), start = state.mode === "for" ? now : pageStart;
    paint(preview, start, endFor(start), now);
  };

  // ---------- Live sign ----------
  var overlay = $("[data-overlay]");
  var live = makeSign($("[data-live]"));
  var session = null, timer = 0, lock = null, idle = 0;

  var chime = function () {
    try {
      var A = window.AudioContext || window.webkitAudioContext, ctx = new A();
      [659.25, 880].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.22;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 1.2);
      });
    } catch (e) { /* no sound: fine */ }
  };

  var wake = function () {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () { lock = null; });
  };
  document.addEventListener("visibilitychange", function () {
    if (session && document.visibilityState === "visible") wake();
  });

  var tick = function () {
    if (!session) return;
    var now = Date.now(), done = paint(live, session.start, session.end, now);
    if (done && !session.rang) { session.rang = true; if (state.chime) chime(); }
  };

  var start = function (how) {
    var now = Date.now();
    session = { start: now, end: endFor(now), how: how, rang: false };
    if (session.end !== null && session.end <= now) session.rang = true;   // already over: no chime
    overlay.hidden = false;
    document.documentElement.classList.add("dnd-on");
    var ctl = W();
    $('[data-ctl="more"]').textContent = ctl.more;
    $('[data-ctl="done"]').textContent = ctl.imfree;
    $('[data-ctl="exit"]').innerHTML = ctl.stop + " <kbd>Esc</kbd>";
    tick();
    clearInterval(timer);
    timer = setInterval(tick, 1000);
    wake();
    showControls();
    if (how === "full" && overlay.requestFullscreen) overlay.requestFullscreen().catch(function () { /* stays as a window */ });
  };
  var stop = function () {
    session = null;
    clearInterval(timer);
    overlay.hidden = true;
    document.documentElement.classList.remove("dnd-on");
    if (lock) { lock.release().catch(function () {}); lock = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
  };

  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && session && session.how === "full") stop();   // Esc in full screen
  });
  document.addEventListener("keydown", function (e) {
    if (!session) return;
    if (e.key === "Escape") stop();
    if ((e.key === "f" || e.key === "F") && !document.fullscreenElement && overlay.requestFullscreen) {
      session.how = "full";
      overlay.requestFullscreen().catch(function () {});
    }
  });

  var showControls = function () {
    overlay.classList.remove("is-idle");
    clearTimeout(idle);
    idle = setTimeout(function () { overlay.classList.add("is-idle"); }, 2500);
  };
  overlay.addEventListener("pointermove", showControls);
  overlay.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ctl]");
    if (!b || !session) return;
    var now = Date.now(), c = b.getAttribute("data-ctl");
    if (c === "exit") stop();
    if (c === "done") { session.end = now; tick(); }
    if (c === "more") {
      var base = session.end !== null && session.end > now ? session.end : now;
      if (session.end === null || session.end <= now) session.start = now;
      session.end = base + 15 * 60000;
      session.rang = false;
      tick();
    }
  });

  // ---------- Link ----------
  var link = function (show) {
    var q = new URLSearchParams();
    Object.keys(KEYS).forEach(function (k) { if (state[KEYS[k]] !== "" && state[KEYS[k]] != null) q.set(k, state[KEYS[k]]); });
    q.set("c", state.clock ? "1" : "0");
    q.set("b", state.bar ? "1" : "0");
    q.set("ch", state.chime ? "1" : "0");
    if (show) q.set("show", "1");
    return location.origin + location.pathname + "#" + q.toString();
  };

  $('[data-go="full"]').addEventListener("click", function () { start("full"); });
  $('[data-go="window"]').addEventListener("click", function () {
    var w = window.open(link(true), "dnd-sign", "popup,width=1280,height=720");
    if (!w) window.tkToast("Your browser blocked the window. Use Full screen instead", true);
  });
  $('[data-copy="link"]').addEventListener("click", function () {
    navigator.clipboard.writeText(link(true)).then(function () { window.tkToast("Link copied. Open it on the other screen"); })
      .catch(function () { window.tkToast("Your browser blocked the clipboard", true); });
  });

  // ---------- Controls ----------
  var press = function (box, value) {
    $$("button[data-value]", box).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === String(value))); });
  };
  var renderPresets = function () {
    $("[data-presets]").innerHTML = PRESETS[state.lang].map(function (p, i) {
      return '<button type="button" data-preset="' + i + '" aria-pressed="' + (i === state.preset) + '"><span>' + p[0] + "</span>" + p[1] + "</button>";
    }).join("");
  };
  $("[data-themes]").innerHTML = THEMES.map(function (t) {
    return '<button type="button" data-value="' + t[0] + '" aria-pressed="false"><i class="sw-' + t[0] + '"></i>' + t[1] + "</button>";
  }).join("");

  var sync = function () {
    press($("[data-lang]"), state.lang);
    press($("[data-mode]"), state.mode);
    press($("[data-for]"), state.forMin);
    press($("[data-themes]"), state.theme);
    renderPresets();
    ["emoji", "text", "sub", "done", "until"].forEach(function (k) {
      var el = $('[data-in="' + k + '"]');
      if (document.activeElement !== el) el.value = state[k];
    });
    $('[data-in="done"]').placeholder = W().done;
    $("[data-mode-until]").hidden = state.mode !== "until";
    $("[data-mode-for]").hidden = state.mode !== "for";
    $('[data-opt="chime"]').checked = !!state.chime;
    $('[data-opt="clock"]').checked = !!state.clock;
    $('[data-opt="bar"]').checked = !!state.bar;
    $('[data-acc="preset"]').textContent = state.preset > -1 ? PRESETS[state.lang][state.preset][1] : "Custom";
    $('[data-acc="words"]').textContent = (state.emoji ? state.emoji + " " : "") + (state.text || W().kicker);
    $('[data-acc="timer"]').textContent = state.mode === "none" ? "No timer" : state.mode === "for" ? state.forMin + " min" : "Until " + state.until;
    $('[data-acc="look"]').textContent = THEMES.filter(function (t) { return t[0] === state.theme; })[0][1];
    drawPreview();
  };
  var changed = function () { save(); sync(); };

  $("[data-presets]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-preset]");
    if (!b) return;
    var i = Number(b.getAttribute("data-preset")), p = PRESETS[state.lang][i];
    state.preset = i; state.emoji = p[0]; state.text = p[1]; state.sub = p[2];
    changed();
  });
  $("[data-lang]").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-value]");
    if (!b) return;
    state.lang = b.getAttribute("data-value");
    if (state.preset > -1) { var p = PRESETS[state.lang][state.preset]; state.emoji = p[0]; state.text = p[1]; state.sub = p[2]; }
    changed();
  });
  [["[data-mode]", "mode"], ["[data-for]", "forMin"], ["[data-themes]", "theme"]].forEach(function (g) {
    $(g[0]).addEventListener("click", function (e) {
      var b = e.target.closest("button[data-value]");
      if (!b) return;
      state[g[1]] = g[1] === "forMin" ? Number(b.getAttribute("data-value")) : b.getAttribute("data-value");
      changed();
    });
  });
  ["emoji", "text", "sub", "done"].forEach(function (k) {
    $('[data-in="' + k + '"]').addEventListener("input", function (e) {
      state[k] = e.target.value;
      if (k !== "done") state.preset = -1;
      changed();
    });
  });
  $('[data-in="until"]').addEventListener("input", function (e) {
    if (/^\d\d:\d\d$/.test(e.target.value)) { state.until = e.target.value; changed(); }
  });
  ["chime", "clock", "bar"].forEach(function (k) {
    $('[data-opt="' + k + '"]').addEventListener("change", function (e) { state[k] = e.target.checked; changed(); });
  });

  if (!("wakeLock" in navigator)) $("[data-wake]").textContent = "This browser may let the screen sleep. Check your power settings.";

  // ---------- Go ----------
  sync();
  setInterval(drawPreview, 1000);
  if (showNow) start("window");
})();
