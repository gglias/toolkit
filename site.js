/* Toolkit — shared bits: Figma multiplayer cursor, dot grid, toast. */
(function () {
  "use strict";

  var root = document.documentElement;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---- Toast ----
  var toastEl, toastTimer;
  window.tkToast = function (text, bad) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.innerHTML = "<i></i><span></span>";
      document.body.appendChild(toastEl);
    }
    toastEl.querySelector("span").textContent = text;
    toastEl.classList.toggle("is-bad", !!bad);
    toastEl.classList.add("is-on");
    // Sit just above the export bar (wherever it is right now), centred on it
    var bar = document.querySelector(".export-bar");
    if (bar) {
      var r = bar.getBoundingClientRect();
      toastEl.style.bottom = Math.max(16, window.innerHeight - r.top + 10) + "px";
      toastEl.style.left = r.left + r.width / 2 + "px";
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  };

  // ---- Figma multiplayer cursor: arrow + tag that says what a click does ----
  var figCursor = document.querySelector("[data-fig-cursor]");
  if (figCursor && fine) {
    var figLabel = figCursor.querySelector("[data-fig-label]");
    var figX = -100, figY = -100, figRaf = 0;
    root.classList.add("has-fig-cursor");

    var labelFor = function (el) {
      if (!el || !el.closest) return "You";
      var tagged = el.closest("[data-cursor]");
      if (tagged) return tagged.getAttribute("data-cursor");
      if (el.closest('input[type="range"]')) return "Drag";
      if (el.closest('input[type="file"], .drop')) return "Upload";
      if (el.closest('input[type="color"]')) return "Pick";
      if (el.closest("select")) return "Choose";
      if (el.closest("summary")) return "Expand";
      var a = el.closest("a, button, label");
      if (a) {
        if (a.tagName === "A") return "Open";
        return "Click";
      }
      return "You";
    };

    var place = function () {
      figRaf = 0;
      figCursor.style.transform = "translate3d(" + figX + "px," + figY + "px,0)";
    };

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      figX = e.clientX;
      figY = e.clientY;
      figCursor.classList.add("is-visible");
      if (!figRaf) figRaf = requestAnimationFrame(place);
    }, { passive: true });

    document.addEventListener("pointerover", function (e) {
      var t = e.target;
      // Over text fields the real I-beam shows instead
      figCursor.classList.toggle("is-text", !!(t.closest && t.closest(".input, .textarea")));
      var text = labelFor(t);
      if (figLabel.textContent !== text) figLabel.textContent = text;
      figCursor.classList.toggle("is-action", text !== "You");
    });

    window.addEventListener("pointerdown", function () { figCursor.classList.add("is-down"); });
    window.addEventListener("pointerup", function () { figCursor.classList.remove("is-down"); });
    root.addEventListener("pointerleave", function () { figCursor.classList.remove("is-visible"); });
    window.addEventListener("blur", function () { figCursor.classList.remove("is-visible"); });
  }

  // ---- Dot grid clears around the mouse (eased) ----
  if (fine) {
    var tx = -999, ty = -999, cx = -999, cy = -999, dotRaf = 0;
    var step = function () {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      root.style.setProperty("--mx", cx.toFixed(1) + "px");
      root.style.setProperty("--my", cy.toFixed(1) + "px");
      dotRaf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    window.addEventListener("pointermove", function (e) {
      if (cx === -999) { cx = e.clientX; cy = e.clientY; }
      tx = e.clientX;
      ty = e.clientY;
      if (!dotRaf) dotRaf = requestAnimationFrame(step);
    }, { passive: true });
  }
})();
