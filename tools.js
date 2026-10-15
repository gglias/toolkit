/* Toolkit — the sidebar. One list of tools for every page, drawn right where
   the <aside> sits (this script runs synchronously, so nothing jumps).
   <html data-base="../" data-tool="qr"> tells it where it is. */
(function () {
  "use strict";

  var html = document.documentElement;
  var base = html.getAttribute("data-base") || "";
  var here = html.getAttribute("data-tool") || "home";

  var ICON = {
    home: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
    favicon: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9h17"/><rect x="7" y="12" width="4.5" height="4.5" rx="1.2"/>',
    colors: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11.5" r="1.1"/><circle cx="10.5" cy="7.6" r="1.1"/><circle cx="15" cy="7.8" r="1.1"/>',
    slugs: '<path d="M5 7h7M8.5 7v10M14 17l3-10 3 10M15 14h4"/>',
    clamp: '<path d="M4 17V7l4 5 4-5v10M15 17h5M17.5 7v10"/>',
    portfolio: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6"/>',
    github: '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    collapse: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  var svg = function (name) {
    return '<svg class="sb-svg" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + "</svg>";
  };

  var GROUPS = [
    { title: "Print & share", items: [{ id: "qr", name: "QR code", href: "qr/" }] },
    { title: "Web", items: [{ id: "favicon", name: "Favicon", href: "favicon/" }] },
    { title: "Design systems", items: [{ id: "colors", name: "Colour palette", href: "colors/", badge: "New" }] },
    { title: "WordPress", items: [{ id: "slugs", name: "Greek → Latin slugs", soon: true }] },
    { title: "CSS", items: [{ id: "clamp", name: "Fluid type", soon: true }] }
  ];

  var item = function (it) {
    var inner = '<span class="sb-ic">' + svg(it.id) + '</span><span class="sb-name">' + it.name + "</span>";
    if (it.soon) {
      return '<span class="sb-item is-soon" aria-disabled="true" data-cursor="Soon">' + inner + '<span class="sb-badge is-soon">Soon</span></span>';
    }
    var cur = it.id === here ? ' aria-current="page"' : "";
    return '<a class="sb-item" href="' + base + it.href + '"' + cur + ' data-cursor="' + it.name + '">' + inner +
      (it.badge ? '<span class="sb-badge">' + it.badge + "</span>" : "") + "</a>";
  };

  var out =
    '<div class="sb-head">' +
      '<a class="sb-brand" href="' + (base || "./") + '" data-cursor="All tools"><img src="' + base + 'assets/gg-light.svg" alt="" width="40" height="33" /><span class="sb-name">Toolkit</span></a>' +
      '<button type="button" class="sb-toggle" data-sb-toggle aria-label="Collapse sidebar" data-cursor="Collapse">' + svg("collapse") + "</button>" +
      '<button type="button" class="sb-close" data-sb-close aria-label="Close menu">' + svg("close") + "</button>" +
    "</div>" +
    '<nav class="sb-nav" aria-label="Tools">' +
      '<a class="sb-item" href="' + (base || "./") + '"' + (here === "home" ? ' aria-current="page"' : "") + ' data-cursor="All tools"><span class="sb-ic">' + svg("home") + '</span><span class="sb-name">All tools</span></a>' +
      GROUPS.map(function (g) {
        return '<div class="sb-group"><p class="sb-group-title"><span>' + g.title + "</span></p>" + g.items.map(item).join("") + "</div>";
      }).join("") +
    "</nav>" +
    '<div class="sb-foot">' +
      '<p class="sb-note">' + svg("lock") + '<span class="sb-name">Runs in your browser. Nothing is uploaded.</span></p>' +
      '<a class="sb-item is-ext" href="https://gglias.github.io/" target="_blank" rel="noopener" data-cursor="Portfolio"><span class="sb-ic">' + svg("portfolio") + '</span><span class="sb-name">Portfolio</span><span class="sb-ext" aria-hidden="true">↗</span></a>' +
      '<a class="sb-item is-ext" href="https://github.com/gglias/toolkit" target="_blank" rel="noopener" data-cursor="Source"><span class="sb-ic">' + svg("github") + '</span><span class="sb-name">Source on GitHub</span><span class="sb-ext" aria-hidden="true">↗</span></a>' +
    "</div>";

  var aside = document.getElementById("sidebar");
  if (!aside) return;
  aside.innerHTML = out;

  // Collapse to icons (desktop), remembered per browser
  var STORE = "tk-sidebar";
  var mini = html.classList.contains("sb-mini");
  var setMini = function (on) {
    mini = on;
    html.classList.toggle("sb-mini", on);
    var t = aside.querySelector("[data-sb-toggle]");
    t.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
    t.setAttribute("data-cursor", on ? "Expand" : "Collapse");
    try { localStorage.setItem(STORE, on ? "mini" : "full"); } catch (e) { /* ignore */ }
  };
  aside.querySelector("[data-sb-toggle]").addEventListener("click", function () { setMini(!mini); });

  // Phone: the sidebar is a drawer
  var open = function (on) {
    html.classList.toggle("sb-open", on);
    var b = document.querySelector("[data-sb-open]");
    if (b) b.setAttribute("aria-expanded", String(on));
    if (on) aside.querySelector(".sb-item, a").focus({ preventScroll: true });
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-sb-open]")) open(true);
    else if (e.target.closest("[data-sb-close], .sb-backdrop")) open(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && html.classList.contains("sb-open")) open(false);
  });
})();
