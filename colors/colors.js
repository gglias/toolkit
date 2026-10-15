/* Toolkit — Color palette & contrast.
   Brand colors → tonal palettes (OKLCH) → Material 3 roles for light and dark,
   every text pair checked (WCAG 2.2) and nudged until it passes → code for
   Flutter, SwiftUI + Xcode assets, Android XML, Compose, CSS and DTCG tokens.
   Everything is computed in the page. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var STORE = "tk-colors";
  var DEFAULT_ERROR = "#ba1a1a";   // Material 3 error
  var state = {
    primary: "#4f46e5",
    secondaryAuto: true, secondary: "#5d5b7d",
    tertiaryAuto: true, tertiary: "#7d4e7d",
    neutralMode: "tinted", neutral: "#77767d",
    error: DEFAULT_ERROR,
    exact: true, target: "AA",
    prefix: "App", pkg: "com.example.app.ui.theme",
    view: "flutter"
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch (e) { /* storage blocked: defaults are fine */ }
  var save = function () {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  };

  // ---------- Color maths ----------
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var hexOk = function (v) { return /^#[0-9a-f]{6}$/i.test(v); };
  var rgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
  var hex = function (c) { return "#" + c.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(""); };
  var toLin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var fromLin = function (v) { return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };

  var oklch = function (h) {
    var c = rgb(h), r = toLin(c[0]), g = toLin(c[1]), b = toLin(c[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
  };
  var linFromOklch = function (L, C, H) {
    var a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    var l = L + 0.3963377774 * a + 0.2158037573 * b;
    var m = L - 0.1055613458 * a - 0.0638541728 * b;
    var s = L - 0.0894841775 * a - 1.291485548 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  };
  var inGamut = function (lin) { return lin.every(function (v) { return v >= -1e-4 && v <= 1 + 1e-4; }); };
  // OKLCH → sRGB, lowering the chroma (never the hue or lightness) until it fits
  var fromOklch = function (L, C, H) {
    var lin = linFromOklch(L, C, H);
    if (!inGamut(lin)) {
      var lo = 0, hi = C;
      for (var i = 0; i < 18; i++) { var mid = (lo + hi) / 2; if (inGamut(linFromOklch(L, mid, H))) lo = mid; else hi = mid; }
      lin = linFromOklch(L, lo, H);
    }
    return lin.map(function (v) { return clamp(fromLin(clamp(v, 0, 1)), 0, 255); });
  };

  var lum = function (c) { return 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]); };
  // CIELAB L* = "tone" in Material 3: 0 black … 100 white
  var toneOf = function (h) { var y = lum(rgb(h)); return y <= 216 / 24389 ? y * 24389 / 27 : 116 * Math.cbrt(y) - 16; };
  var wcag = function (a, b) { var x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // rounded down, so a 4.48 never shows as a passing "4.5"
  var fmt = function (r) { return (Math.floor(r * 10) / 10).toFixed(1); };
  // APCA (0.0.98G-4g), text on background; shown for reference only
  var apca = function (txt, bg) {
    var Y = function (h) { var c = rgb(h); return 0.2126729 * Math.pow(c[0] / 255, 2.4) + 0.7151522 * Math.pow(c[1] / 255, 2.4) + 0.072175 * Math.pow(c[2] / 255, 2.4); };
    var t = Y(txt), b = Y(bg);
    t = t > 0.022 ? t : t + Math.pow(0.022 - t, 1.414);
    b = b > 0.022 ? b : b + Math.pow(0.022 - b, 1.414);
    if (Math.abs(b - t) < 0.0005) return 0;
    var s = b > t ? (Math.pow(b, 0.56) - Math.pow(t, 0.57)) * 1.14 : (Math.pow(b, 0.65) - Math.pow(t, 0.62)) * 1.14;
    return Math.round((Math.abs(s) < 0.1 ? 0 : s > 0 ? s - 0.027 : s + 0.027) * 100);
  };

  // A color of family f at a given tone (hue and chroma kept, chroma clipped to sRGB)
  var tone = function (f, T) {
    if (T >= 100) return "#ffffff";
    if (T <= 0) return "#000000";
    var lo = 0, hi = 1;
    for (var i = 0; i < 22; i++) {
      var mid = (lo + hi) / 2;
      if (toneOf(hex(fromOklch(mid, f.c, f.h))) < T) lo = mid; else hi = mid;
    }
    return hex(fromOklch((lo + hi) / 2, f.c, f.h));
  };

  // ---------- Families, palettes, roles ----------
  var FAMS = ["primary", "secondary", "tertiary", "neutral", "neutralVariant", "error"];
  var FAM_NAME = { primary: "Primary", secondary: "Secondary", tertiary: "Tertiary", neutral: "Neutral", neutralVariant: "Neutral variant", error: "Error" };
  var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var STEP_TONES = [97, 93, 86, 77, 67, 57, 48, 40, 32, 24, 15];

  var family = function (h) { var o = oklch(h); return { h: o.h, c: o.c, hex: h, t: toneOf(h) }; };

  var families = function () {
    var p = family(state.primary);
    var f = { primary: p, error: family(state.error) };
    f.secondary = state.secondaryAuto ? { h: p.h, c: Math.min(p.c, 0.045) } : family(state.secondary);
    f.tertiary = state.tertiaryAuto ? { h: (p.h + 60) % 360, c: clamp(p.c * 0.7, 0.05, 0.09) } : family(state.tertiary);
    if (state.neutralMode === "grey") { f.neutral = { h: 0, c: 0 }; f.neutralVariant = { h: 0, c: 0 }; }
    else {
      var n = state.neutralMode === "custom" ? oklch(state.neutral) : p;
      f.neutral = { h: n.h, c: Math.min(n.c, state.neutralMode === "custom" ? 0.04 : 0.012) };
      f.neutralVariant = { h: n.h, c: Math.min(n.c * (state.neutralMode === "custom" ? 1.6 : 1), state.neutralMode === "custom" ? 0.06 : 0.03) };
    }
    return f;
  };

  // 11 steps; the user's own color replaces the step closest to it
  var palette = function (f) {
    var list = STEP_TONES.map(function (T, i) { return { step: STEPS[i], hex: tone(f, T) }; });
    if (f.hex) {
      var best = 0;
      STEP_TONES.forEach(function (T, i) { if (Math.abs(T - f.t) < Math.abs(STEP_TONES[best] - f.t)) best = i; });
      list[best] = { step: STEPS[best], hex: f.hex.toLowerCase(), base: true };
    }
    return list;
  };

  var ACCENTS = ["primary", "secondary", "tertiary", "error"];
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var ROLES = [];
  ACCENTS.forEach(function (a) { ROLES.push(a, "on" + cap(a), a + "Container", "on" + cap(a) + "Container"); });
  ROLES.push("surface", "onSurface", "surfaceDim", "surfaceBright", "surfaceContainerLowest", "surfaceContainerLow",
    "surfaceContainer", "surfaceContainerHigh", "surfaceContainerHighest", "onSurfaceVariant", "outline", "outlineVariant",
    "inverseSurface", "onInverseSurface", "inversePrimary", "surfaceTint", "shadow", "scrim");

  // Pairs that must read: [text, background, kind, what it is]
  var PAIRS = [
    ["onPrimary", "primary", "text", "Filled buttons"],
    ["onPrimaryContainer", "primaryContainer", "text", "Primary containers, FAB"],
    ["onSecondary", "secondary", "text", "Secondary buttons"],
    ["onSecondaryContainer", "secondaryContainer", "text", "Chips, selected tabs"],
    ["onTertiary", "tertiary", "text", "Tertiary buttons"],
    ["onTertiaryContainer", "tertiaryContainer", "text", "Tertiary containers"],
    ["onError", "error", "text", "Error buttons"],
    ["onErrorContainer", "errorContainer", "text", "Error banners"],
    ["onSurface", "surface", "text", "Body text"],
    ["onSurface", "surfaceContainerHighest", "text", "Text on raised cards"],
    ["onSurfaceVariant", "surface", "text", "Secondary text"],
    ["onSurfaceVariant", "surfaceContainerHigh", "text", "Search fields, hints"],
    ["primary", "surface", "text", "Links, text buttons"],
    ["onInverseSurface", "inverseSurface", "text", "Snackbars"],
    ["inversePrimary", "inverseSurface", "text", "Snackbar action"],
    ["outline", "surface", "ui", "Field & button borders"]
  ];
  var need = function (kind) { return kind === "ui" ? 3 : state.target === "AAA" ? 7 : 4.5; };

  var build = function () {
    var F = families();
    var out = { fams: F, pal: {}, light: {}, dark: {}, issues: [] };
    FAMS.forEach(function (k) { out.pal[k] = palette(F[k]); });

    ["light", "dark"].forEach(function (mode) {
      var L = mode === "light", r = out[mode];
      var set = function (k, f, T) { r[k] = { f: f, t: T, hex: tone(f, T) }; };
      var lock = function (k, h) { r[k] = { hex: h, locked: true }; };

      ACCENTS.forEach(function (a) {
        var f = F[a], on = "on" + cap(a);
        // Material's own red is a default, not one of your colors
        var yours = f.hex && !(a === "error" && f.hex.toLowerCase() === DEFAULT_ERROR);
        if (L && state.exact && yours) {
          // your color stays as it is; its text is white, a near-black of the same hue
          // or pure black: the first that passes, else the one that reads best
          lock(a, f.hex.toLowerCase());
          var picks = ["#ffffff", tone(f, 10), "#000000"];
          var pick = picks.filter(function (c) { return wcag(c, f.hex) >= need("text"); })[0] ||
            picks.slice().sort(function (x, y) { return wcag(y, f.hex) - wcag(x, f.hex); })[0];
          lock(on, pick);
        } else {
          set(a, f, L ? 40 : 80);
          set(on, f, L ? 100 : 20);
        }
        set(a + "Container", f, L ? 90 : 30);
        set(on + "Container", f, L ? 10 : 90);
      });

      var N = F.neutral, NV = F.neutralVariant;
      set("surface", N, L ? 98 : 6);
      set("onSurface", N, L ? 10 : 90);
      set("surfaceDim", N, L ? 87 : 6);
      set("surfaceBright", N, L ? 98 : 24);
      set("surfaceContainerLowest", N, L ? 100 : 4);
      set("surfaceContainerLow", N, L ? 96 : 10);
      set("surfaceContainer", N, L ? 94 : 12);
      set("surfaceContainerHigh", N, L ? 92 : 17);
      set("surfaceContainerHighest", N, L ? 90 : 22);
      set("onSurfaceVariant", NV, L ? 30 : 80);
      set("outline", NV, L ? 50 : 60);
      set("outlineVariant", NV, L ? 80 : 30);
      set("inverseSurface", N, L ? 20 : 90);
      set("onInverseSurface", N, L ? 95 : 20);
      set("inversePrimary", F.primary, L ? 80 : 40);

      // Nudge every derived color that misses its target: the text away from its
      // background first; if the text is already white or black, the background
      var push = function (role, away, other, min) {
        var dir = toneOf(away.hex) > 50 ? -1 : 1;
        for (var i = 0; i < 60 && wcag(role.hex, other.hex) < min; i++) {
          if ((dir < 0 && role.t <= 0) || (dir > 0 && role.t >= 100)) break;
          role.t = clamp(role.t + dir * 2, 0, 100);
          role.hex = tone(role.f, role.t);
          role.nudged = true;
        }
      };
      PAIRS.forEach(function (p) {
        var fg = r[p[0]], bg = r[p[1]], min = need(p[2]);
        if (wcag(fg.hex, bg.hex) >= min) return;
        if (!fg.locked && fg.f) push(fg, bg, bg, min);
        // only a button color may move; surfaces are shared by every other pair
        if (wcag(fg.hex, bg.hex) < min && ACCENTS.indexOf(p[1]) > -1 && !bg.locked && bg.f) push(bg, fg, fg, min);
      });
      // what still fails, after every nudge
      PAIRS.forEach(function (p) {
        if (wcag(r[p[0]].hex, r[p[1]].hex) < need(p[2])) out.issues.push({ mode: mode, pair: p });
      });

      r.surfaceTint = { hex: r.primary.hex };
      r.shadow = { hex: "#000000" };
      r.scrim = { hex: "#000000" };
    });
    return out;
  };

  // ---------- Names ----------
  var P = function () {
    var v = (state.prefix || "").replace(/[^A-Za-z0-9]/g, "");
    if (!/^[A-Za-z]/.test(v)) v = "App";
    return v.charAt(0).toUpperCase() + v.slice(1);
  };
  var p = function () { return P().toLowerCase(); };
  var snake = function (s) { return s.replace(/[A-Z]/g, function (m) { return "_" + m.toLowerCase(); }); };
  var kebab = function (s) { return s.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }); };
  var pkg = function () { return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(state.pkg) ? state.pkg : "com.example.app.ui.theme"; };
  var argb = function (h) { return "0xFF" + h.slice(1).toUpperCase(); };
  var HEAD = "Generated by Toolkit · https://gglias.github.io/toolkit/colors/";

  // ---------- Exporters ----------
  var X = {};
  var cur;   // the last build

  X.flutter = function () {
    var o = [];
    o.push("// " + P() + " colors · " + HEAD);
    o.push("// Material 3 color schemes for light and dark. Every text pair passes WCAG " + state.target + ".");
    o.push("//");
    o.push("//   MaterialApp(");
    o.push("//     theme: ThemeData(colorScheme: " + P() + "Colors.light),");
    o.push("//     darkTheme: ThemeData(colorScheme: " + P() + "Colors.dark),");
    o.push("//   );");
    o.push("//");
    o.push("// Then: Theme.of(context).colorScheme.primary · needs Flutter 3.22+");
    o.push("import 'package:flutter/material.dart';");
    o.push("");
    o.push("/// Tonal palettes: 50 is the lightest, 950 the darkest.");
    o.push("abstract final class " + P() + "Palette {");
    FAMS.forEach(function (k, i) {
      if (i) o.push("");
      cur.pal[k].forEach(function (s) { o.push("  static const Color " + k + s.step + " = Color(" + argb(s.hex) + ");"); });
    });
    o.push("}");
    o.push("");
    o.push("abstract final class " + P() + "Colors {");
    ["light", "dark"].forEach(function (mode, i) {
      if (i) o.push("");
      o.push("  static const ColorScheme " + mode + " = ColorScheme(");
      o.push("    brightness: Brightness." + mode + ",");
      ROLES.forEach(function (role) { o.push("    " + role + ": Color(" + argb(cur[mode][role].hex) + "),"); });
      o.push("  );");
    });
    o.push("}");
    return o.join("\n") + "\n";
  };

  X.swift = function () {
    var o = [];
    o.push("// " + P() + "Color.swift · " + HEAD);
    o.push("// The colors live in Colors.xcassets, each with a light and a dark version.");
    o.push("// Drag the Colors.xcassets folder into Xcode, add this file, then:");
    o.push("//   Text(\"Hello\").foregroundStyle(" + P() + "Color.onSurface)");
    o.push("import SwiftUI");
    o.push("");
    o.push("enum " + P() + "Color {");
    ROLES.forEach(function (role) { o.push("    static let " + role + " = Color(\"" + p() + cap(role) + "\")"); });
    o.push("");
    o.push("    /// Tonal palettes: 50 is the lightest, 950 the darkest.");
    o.push("    enum Palette {");
    FAMS.forEach(function (k) { cur.pal[k].forEach(function (s) { o.push("        static let " + k + s.step + " = Color(\"" + p() + cap(k) + s.step + "\")"); }); });
    o.push("    }");
    o.push("}");
    return o.join("\n") + "\n";
  };

  var colorset = function (light, dark) {
    var comp = function (h) {
      var c = rgb(h);
      return { "color-space": "srgb", components: { alpha: "1.000", blue: (c[2] / 255).toFixed(3), green: (c[1] / 255).toFixed(3), red: (c[0] / 255).toFixed(3) } };
    };
    var colors = [{ color: comp(light), idiom: "universal" }];
    if (dark) colors.push({ appearances: [{ appearance: "luminosity", value: "dark" }], color: comp(dark), idiom: "universal" });
    return JSON.stringify({ colors: colors, info: { author: "xcode", version: 1 } }, null, 2) + "\n";
  };
  var INFO = JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2) + "\n";

  // All the files of the asset catalog, as [path, text]
  var xcassets = function () {
    var base = "ios/Colors.xcassets/", files = [[base + "Contents.json", INFO]];
    ROLES.forEach(function (role) { files.push([base + p() + cap(role) + ".colorset/Contents.json", colorset(cur.light[role].hex, cur.dark[role].hex)]); });
    files.push([base + "Palette/Contents.json", INFO]);
    FAMS.forEach(function (k) { cur.pal[k].forEach(function (s) { files.push([base + "Palette/" + p() + cap(k) + s.step + ".colorset/Contents.json", colorset(s.hex)]); }); });
    return files;
  };
  X.assets = function () {
    var f = xcassets();
    return "// Colors.xcassets · " + f.length + " files · every role has a light and a dark version\n" +
      "// " + f.slice(0, 4).map(function (x) { return x[0].replace("ios/", ""); }).join("\n// ") + "\n// …\n\n" +
      "// " + p() + "Primary.colorset/Contents.json\n" + colorset(cur.light.primary.hex, cur.dark.primary.hex);
  };

  var xml = function (mode, withPalette) {
    var o = ['<?xml version="1.0" encoding="utf-8"?>'];
    o.push("<!-- " + P() + " colors, " + mode + " theme · " + HEAD + " -->");
    if (mode === "light") o.push("<!-- Dark versions of the roles: res/values-night/colors.xml -->");
    o.push("<resources>");
    ROLES.forEach(function (role) { o.push('    <color name="' + p() + "_" + snake(role) + '">' + cur[mode][role].hex.toUpperCase() + "</color>"); });
    if (withPalette) {
      o.push("");
      o.push("    <!-- Tonal palettes: 50 lightest, 950 darkest -->");
      FAMS.forEach(function (k) { cur.pal[k].forEach(function (s) { o.push('    <color name="' + p() + "_" + snake(k) + "_" + s.step + '">' + s.hex.toUpperCase() + "</color>"); }); });
    }
    o.push("</resources>");
    return o.join("\n") + "\n";
  };
  X.android = function () { return xml("light", true); };
  X.night = function () { return xml("dark", false); };

  // Compose names two roles differently, and has no "shadow"
  var COMPOSE = { onInverseSurface: "inverseOnSurface" };
  X.compose = function () {
    var o = [];
    o.push("// Theme.kt · " + HEAD);
    o.push("// Material 3 color schemes for light and dark. Wrap your app in " + P() + "Theme { … }");
    o.push("package " + pkg());
    o.push("");
    o.push("import androidx.compose.foundation.isSystemInDarkTheme");
    o.push("import androidx.compose.material3.MaterialTheme");
    o.push("import androidx.compose.material3.darkColorScheme");
    o.push("import androidx.compose.material3.lightColorScheme");
    o.push("import androidx.compose.runtime.Composable");
    o.push("import androidx.compose.ui.graphics.Color");
    o.push("");
    o.push("/** Tonal palettes: 50 is the lightest, 950 the darkest. */");
    o.push("object " + P() + "Palette {");
    FAMS.forEach(function (k) { cur.pal[k].forEach(function (s) { o.push("    val " + cap(k) + s.step + " = Color(" + argb(s.hex) + ")"); }); });
    o.push("}");
    ["light", "dark"].forEach(function (mode) {
      o.push("");
      o.push("val " + P() + cap(mode) + "Colors = " + mode + "ColorScheme(");
      ROLES.forEach(function (role) {
        if (role === "shadow") return;
        o.push("    " + (COMPOSE[role] || role) + " = Color(" + argb(cur[mode][role].hex) + "),");
      });
      o.push("    background = Color(" + argb(cur[mode].surface.hex) + "),");
      o.push("    onBackground = Color(" + argb(cur[mode].onSurface.hex) + "),");
      o.push("    surfaceVariant = Color(" + argb(cur[mode].surfaceContainerHighest.hex) + "),");
      o.push(")");
    });
    o.push("");
    o.push("@Composable");
    o.push("fun " + P() + "Theme(");
    o.push("    darkTheme: Boolean = isSystemInDarkTheme(),");
    o.push("    content: @Composable () -> Unit,");
    o.push(") {");
    o.push("    MaterialTheme(");
    o.push("        colorScheme = if (darkTheme) " + P() + "DarkColors else " + P() + "LightColors,");
    o.push("        content = content,");
    o.push("    )");
    o.push("}");
    return o.join("\n") + "\n";
  };

  X.css = function () {
    var v = function (role, mode) { return "  --" + p() + "-" + kebab(role) + ": " + cur[mode][role].hex + ";"; };
    var o = ["/* " + P() + " colors · " + HEAD + " */", ":root {", "  color-scheme: light;"];
    FAMS.forEach(function (k) { cur.pal[k].forEach(function (s) { o.push("  --" + p() + "-" + kebab(k) + "-" + s.step + ": " + s.hex + ";"); }); });
    o.push("");
    ROLES.forEach(function (r) { o.push(v(r, "light")); });
    o.push("}");
    var dark = ROLES.map(function (r) { return "  " + v(r, "dark"); });
    o.push("");
    o.push("/* Dark: follows the system, unless the page says data-theme=\"light\" */");
    o.push("@media (prefers-color-scheme: dark) {");
    o.push('  :root:not([data-theme="light"]) {');
    o.push("    color-scheme: dark;");
    o.push.apply(o, dark);
    o.push("  }");
    o.push("}");
    o.push('[data-theme="dark"] {');
    o.push("  color-scheme: dark;");
    ROLES.forEach(function (r) { o.push(v(r, "dark")); });
    o.push("}");
    return o.join("\n") + "\n";
  };

  X.tokens = function () {
    var t = function (h) { return { $type: "color", $value: h }; };
    var doc = { $description: P() + " colors · " + HEAD + " · Design Tokens (W3C DTCG) format", palette: {}, light: {}, dark: {} };
    FAMS.forEach(function (k) { doc.palette[k] = {}; cur.pal[k].forEach(function (s) { doc.palette[k][s.step] = t(s.hex); }); });
    ["light", "dark"].forEach(function (mode) { ROLES.forEach(function (r) { doc[mode][r] = t(cur[mode][r].hex); }); });
    return JSON.stringify(doc, null, 2) + "\n";
  };

  var VIEWS = [
    ["flutter", "Flutter", function () { return "flutter/" + snake(P()).replace(/^_/, "") + "_colors.dart"; }],
    ["swift", "SwiftUI", function () { return "ios/" + P() + "Color.swift"; }],
    ["assets", "Xcode assets", function () { return "ios/Colors.xcassets/"; }],
    ["android", "Android", function () { return "android/res/values/colors.xml"; }],
    ["night", "Android dark", function () { return "android/res/values-night/colors.xml"; }],
    ["compose", "Compose", function () { return "android/compose/Theme.kt"; }],
    ["css", "CSS", function () { return "web/colors.css"; }],
    ["tokens", "Tokens", function () { return "tokens/tokens.json"; }]
  ];
  var viewFile = function (id) { return VIEWS.filter(function (v) { return v[0] === id; })[0][2](); };

  var readme = function () {
    return [
      P() + " colors · " + HEAD,
      "",
      "Light and dark Material 3 color schemes plus tonal palettes (50 lightest, 950 darkest).",
      "Every text color passes WCAG " + state.target + " on its background; borders pass 3:1.",
      "",
      "FLUTTER  " + viewFile("flutter"),
      "  Copy into lib/, then:",
      "  MaterialApp(theme: ThemeData(colorScheme: " + P() + "Colors.light), darkTheme: ThemeData(colorScheme: " + P() + "Colors.dark))",
      "  Use: Theme.of(context).colorScheme.primary, or " + P() + "Palette.primary500",
      "",
      "iOS / SWIFTUI  ios/",
      "  Drag Colors.xcassets into Xcode (or merge it into your Assets.xcassets) and add " + P() + "Color.swift.",
      "  Use: " + P() + "Color.primary, " + P() + "Color.Palette.primary500 · light and dark switch by themselves.",
      "",
      "ANDROID  android/res/",
      "  Merge values/colors.xml and values-night/colors.xml into app/src/main/res/.",
      "  Use: @color/" + p() + "_primary",
      "",
      "JETPACK COMPOSE  " + viewFile("compose"),
      "  Package " + pkg() + ". Wrap your app: " + P() + "Theme { … }, then MaterialTheme.colorScheme.primary",
      "",
      "WEB  web/colors.css",
      "  CSS variables: var(--" + p() + "-primary). Dark follows the system; data-theme=\"dark\" or \"light\" on <html> forces one.",
      "",
      "DESIGN TOKENS  tokens/tokens.json",
      "  W3C DTCG format, for Style Dictionary, Tokens Studio and other token tools.",
      "",
      "FIGMA",
      "  On the page, \"Copy for Figma\" pastes the palettes and roles as vector swatches.",
      ""
    ].join("\r\n");
  };

  var zipFiles = function () {
    var enc = new TextEncoder(), list = [];
    var add = function (name, text) { list.push({ name: name, data: enc.encode(text) }); };
    add(viewFile("flutter"), X.flutter());
    add(viewFile("swift"), X.swift());
    xcassets().forEach(function (f) { add(f[0], f[1]); });
    add(viewFile("android"), X.android());
    add(viewFile("night"), X.night());
    add(viewFile("compose"), X.compose());
    add(viewFile("css"), X.css());
    add(viewFile("tokens"), X.tokens());
    add("palette.svg", figmaSvg());
    add("how-to-use.txt", readme());
    return list;
  };

  // Palettes + roles as one SVG: Figma pastes it as editable swatches and text
  var figmaSvg = function () {
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    var W = 64, G = 8, LEFT = 140, y = 40, o = [];
    var text = function (x, yy, s, size, weight, fill) { o.push('<text x="' + x + '" y="' + yy + '" font-family="Inter, Arial, sans-serif" font-size="' + size + '" font-weight="' + (weight || 400) + '" fill="' + (fill || "#1b1b1f") + '">' + esc(s) + "</text>"); };
    text(24, y, P() + " colors", 22, 700);
    y += 36;
    FAMS.forEach(function (k) {
      text(24, y + 36, FAM_NAME[k], 13, 600);
      cur.pal[k].forEach(function (s, i) {
        var x = LEFT + i * (W + G);
        o.push('<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + W + '" rx="8" fill="' + s.hex + '"' + (s.step === 50 ? ' stroke="#e3e3e8"' : "") + "/>");
        text(x, y + W + 15, s.step + (s.base ? " ●" : ""), 10, 600);
        text(x, y + W + 28, s.hex.toUpperCase(), 9, 400, "#6b6b74");
      });
      y += W + 46;
    });
    y += 16;
    ["light", "dark"].forEach(function (mode, col) {
      var x0 = 24 + col * 420, yy = y;
      text(x0, yy, cap(mode) + " roles", 15, 700);
      yy += 16;
      ROLES.forEach(function (role, i) {
        if (role === "shadow" || role === "scrim" || role === "surfaceTint") return;
        var cx = x0 + (i % 2) * 200, cy = yy + Math.floor(i / 2) * 40;
        o.push('<rect x="' + cx + '" y="' + cy + '" width="28" height="28" rx="6" fill="' + cur[mode][role].hex + '" stroke="#e3e3e8"/>');
        text(cx + 36, cy + 12, role, 11, 600);
        text(cx + 36, cy + 25, cur[mode][role].hex.toUpperCase(), 9, 400, "#6b6b74");
      });
    });
    var height = y + 16 + Math.ceil(ROLES.length / 2) * 40 + 24;
    var width = Math.max(LEFT + 11 * (W + G) + 16, 24 + 420 + 400);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">' +
      '<rect width="' + width + '" height="' + height + '" fill="#ffffff"/>' + o.join("") + "</svg>\n";
  };

  // ---------- The phone previews ----------
  var PHONE =
    '<div class="ph">' +
      '<div class="ph-status"><b>9:41</b><span></span></div>' +
      '<div class="ph-top"><span class="ph-title">Inbox</span><span class="ph-me">G</span></div>' +
      '<div class="ph-search">Search mail</div>' +
      '<div class="ph-chips"><span class="is-on">All</span><span>Unread</span><span>Starred</span></div>' +
      '<div class="ph-banner">Couldn\'t sync <b>Retry</b></div>' +
      '<div class="ph-item"><span class="ph-av">A</span><span class="ph-txt"><b>Anna</b><small>Proofs are ready for review</small></span><span class="ph-badge">2</span></div>' +
      '<div class="ph-item"><span class="ph-av is-t">M</span><span class="ph-txt"><b>Marios</b><small>New logo, two options</small></span></div>' +
      '<div class="ph-card"><b>Design review</b><small>Today · 15:00 · Studio</small><div class="ph-btns"><span class="ph-btn">Join</span><span class="ph-tbtn">Later</span></div></div>' +
      '<span class="ph-fab">+</span>' +
      '<div class="ph-snack">Archived <b>Undo</b></div>' +
      '<div class="ph-nav"><span class="is-on"><i></i>Mail</span><span><i></i>Chat</span><span><i></i>Meet</span></div>' +
    "</div>";
  $$("[data-phone]").forEach(function (el) { el.innerHTML = PHONE; });

  // ---------- Render ----------
  var ICONS = {
    ok: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17h.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M12 11v6M12 7h.01"/></svg>',
    wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.2"/></svg>'
  };
  var setCheck = function (id, st, html) {
    var li = $('[data-check="' + id + '"]');
    li.setAttribute("data-state", st);
    $("[data-ic]", li).innerHTML = ICONS[st];
    $("[data-v]", li).innerHTML = html;
  };
  var chip = function (h) { return '<i style="--chip:' + h + '"></i>'; };
  var best = function (bg) { return wcag("#ffffff", bg) >= wcag("#111111", bg) ? "#ffffff" : "#111111"; };

  var renderRamps = function () {
    $("[data-ramps]").innerHTML = FAMS.map(function (k) {
      return '<div class="ramp"><span class="ramp-name">' + FAM_NAME[k] + '</span><div class="ramp-row">' +
        cur.pal[k].map(function (s) {
          var fg = best(s.hex);
          return '<button type="button" class="sw' + (s.base ? " is-base" : "") + '" style="background:' + s.hex + ";color:" + fg + '" data-hex-copy="' + s.hex + '" data-cursor="' + s.hex.toUpperCase() + '" title="' + k + "-" + s.step + " · " + s.hex.toUpperCase() + " · " + fmt(wcag(fg, s.hex)) + ':1 with this text">' +
            "<b>" + s.step + "</b><small>" + s.hex.slice(1).toUpperCase() + "</small></button>";
        }).join("") + "</div></div>";
    }).join("");
  };

  var renderTable = function () {
    var cell = function (mode, pr) {
      var fg = cur[mode][pr[0]].hex, bg = cur[mode][pr[1]].hex, r = wcag(fg, bg), ok = r >= need(pr[2]);
      var nudged = cur[mode][pr[0]].nudged || cur[mode][pr[1]].nudged;
      return '<td data-state="' + (ok ? "ok" : "bad") + '"><span class="aa" style="background:' + bg + ";color:" + fg + (pr[2] === "ui" ? ";box-shadow:inset 0 0 0 2px " + fg : "") + '">' + (pr[2] === "ui" ? "" : "Aa") + "</span>" +
        "<span class=\"cr\"><b>" + fmt(r) + ":1</b><small>" + (pr[2] === "ui" ? "border" : "Lc " + Math.abs(apca(fg, bg))) + (nudged ? " · nudged" : "") + "</small></span></td>";
    };
    $("[data-ctable]").innerHTML =
      "<thead><tr><th>Pair</th><th>Light</th><th>Dark</th></tr></thead><tbody>" +
      PAIRS.map(function (pr) {
        return "<tr><th scope=\"row\"><b>" + pr[3] + "</b><small>" + pr[0] + " on " + pr[1] + "</small></th>" + cell("light", pr) + cell("dark", pr) + "</tr>";
      }).join("") + "</tbody>";
    $("[data-target-note]").textContent = "WCAG " + state.target + " · text " + need("text") + ":1 · borders 3:1";
  };

  var renderChecks = function () {
    var total = PAIRS.length * 2, fails = cur.issues.length;
    var nudged = 0;
    ["light", "dark"].forEach(function (m) { ROLES.forEach(function (r) { if (cur[m][r].nudged) nudged++; }); });
    if (!fails) setCheck("contrast", "ok", "All " + total + " pairs pass " + state.target + (nudged ? "<small>" + nudged + " color" + (nudged > 1 ? "s were" : " was") + " nudged lighter or darker to get there.</small>" : ""));
    else setCheck("contrast", "bad", fails + " of " + total + " pairs below " + state.target + "<small>" + cur.issues.map(function (i) { return i.pair[3] + " (" + i.mode + ")"; }).join(", ") + "</small>");

    // Your exact colors: does each one carry text?
    if (!state.exact) setCheck("exact", "info", "Material 3 tones<small>Your colors set the hue; each role uses the tone that reads best. Turn on <b>Use my exact colors</b> to keep them as they are.</small>");
    else {
      // light-mode problems that involve one of your exact colors
      var bad = cur.issues.filter(function (i) { return i.mode === "light" && (cur.light[i.pair[0]].locked || cur.light[i.pair[1]].locked); });
      if (!bad.length) setCheck("exact", "ok", "Used as they are in light mode<small>Their text color (white or near-black) passes " + state.target + ".</small>");
      else {
        var tips = bad.map(function (i) {
          var accent = ACCENTS.filter(function (a) { return i.pair[0] === a || i.pair[1] === a || i.pair[0] === "on" + cap(a); })[0] || "primary";
          var f = cur.fams[accent];
          // the nearest darker shade of the same color that carries white text
          var fix = "";
          for (var T = Math.floor(f.t); T >= 0; T--) { var h = tone(f, T); if (wcag("#ffffff", h) >= need("text")) { fix = h; break; } }
          return "<b>" + accent + "</b> " + f.hex.toUpperCase() + " · " + i.pair[3].toLowerCase() + " " + fmt(wcag(cur.light[i.pair[0]].hex, cur.light[i.pair[1]].hex)) + ":1" +
            (fix ? " → " + fix.toUpperCase() + " passes" : "");
        });
        setCheck("exact", "warn", "Some of your colors don't carry text<small>" + tips.join("<br />") + ". Use the darker shade, or turn off <b>Use my exact colors</b>.</small>");
      }
    }
    setCheck("dark", "info", "Generated from the same hues<small>Material 3 tones: lighter accents (tone 80) on near-black surfaces (tone 6).</small>");
  };

  var renderPhones = function () {
    ["light", "dark"].forEach(function (mode) {
      var el = $('[data-phone="' + mode + '"] .ph');
      ROLES.forEach(function (r) { el.style.setProperty("--" + r, cur[mode][r].hex); });
    });
  };

  var renderCode = function () {
    $("[data-code-tabs]").innerHTML = VIEWS.map(function (v) {
      return '<button type="button" role="tab" aria-selected="' + (v[0] === state.view) + '" data-view="' + v[0] + '">' + v[1] + "</button>";
    }).join("");
    $("[data-code]").textContent = X[state.view]();
    $("[data-code-file]").textContent = viewFile(state.view);
  };

  var renderHeads = function () {
    var val = function (key, autoKey) { return state[autoKey] ? "Auto" : chip(state[key]) + state[key].toUpperCase(); };
    $('[data-acc="primary"]').innerHTML = chip(state.primary) + state.primary.toUpperCase();
    $('[data-acc="secondary"]').innerHTML = state.secondaryAuto ? chip(cur.light.secondary.hex) + "Auto" : val("secondary");
    $('[data-acc="tertiary"]').innerHTML = state.tertiaryAuto ? chip(cur.light.tertiary.hex) + "Auto" : val("tertiary");
    $('[data-acc="neutral"]').innerHTML = chip(cur.pal.neutral[5].hex) + { tinted: "Tinted", grey: "Pure grey", custom: state.neutral.toUpperCase() }[state.neutralMode];
    $('[data-acc="error"]').innerHTML = chip(state.error) + state.error.toUpperCase();
    $('[data-acc="rules"]').textContent = (state.exact ? "Exact" : "M3 tones") + " · " + state.target;
    $('[data-acc="names"]').textContent = P() + " · " + pkg().split(".").slice(-2).join(".");
    var catalog = xcassets().length;
    $('[data-acc="files"]').textContent = (9 + catalog) + " files";
    $("[data-name-demo]").textContent = P() + "Colors · " + p() + "Primary · " + p() + "_primary · --" + p() + "-primary";
    $("[data-files]").innerHTML = [
      [viewFile("flutter"), "Flutter · light & dark ColorScheme + palettes"],
      [viewFile("swift"), "SwiftUI · " + P() + "Color.primary"],
      ["ios/Colors.xcassets/", (ROLES.length + FAMS.length * STEPS.length) + " color sets · roles light & dark"],
      [viewFile("android"), "Android · roles + palettes"],
      [viewFile("night"), "Android · dark roles"],
      [viewFile("compose"), "Compose · " + P() + "Theme { }"],
      [viewFile("css"), "CSS variables, light & dark"],
      [viewFile("tokens"), "Design tokens (W3C DTCG)"],
      ["palette.svg", "Swatches for Figma or docs"],
      ["how-to-use.txt", "Where each file goes"]
    ].map(function (f) { return "<li><b>" + f[0] + "</b><span>" + f[1] + "</span></li>"; }).join("");
  };

  var raf = 0;
  var update = function () {
    raf = 0;
    cur = build();
    renderPhones();
    renderRamps();
    renderTable();
    renderChecks();
    renderCode();
    renderHeads();
  };
  var schedule = function () { if (!raf) raf = requestAnimationFrame(update); };

  // ---------- Controls ----------
  var COLOR_KEYS = ["primary", "secondary", "tertiary", "neutral", "error"];
  var press = function (box, value) {
    $$("button[data-value]", box).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === String(value))); });
  };
  var sync = function () {
    COLOR_KEYS.forEach(function (key) {
      var picker = $('[data-color="' + key + '"]'), h = $('[data-hex="' + key + '"]');
      picker.value = state[key];
      if (document.activeElement !== h) h.value = state[key].toUpperCase();
      $('[data-swatch="' + key + '"]').style.setProperty("--swatch", state[key]);
    });
    ["secondary", "tertiary"].forEach(function (k) {
      $('[data-auto="' + k + '"]').checked = !!state[k + "Auto"];
      $('[data-color-row="' + k + '"]').hidden = !!state[k + "Auto"];
    });
    press($("[data-neutral]"), state.neutralMode);
    $('[data-color-row="neutral"]').hidden = state.neutralMode !== "custom";
    $('[data-opt="exact"]').checked = !!state.exact;
    press($("[data-target]"), state.target);
    if (document.activeElement !== $('[data-in="prefix"]')) $('[data-in="prefix"]').value = state.prefix;
    if (document.activeElement !== $('[data-in="pkg"]')) $('[data-in="pkg"]').value = state.pkg;
  };
  var changed = function () { sync(); save(); schedule(); };

  COLOR_KEYS.forEach(function (key) {
    var picker = $('[data-color="' + key + '"]'), h = $('[data-hex="' + key + '"]');
    picker.addEventListener("input", function () { state[key] = picker.value.toLowerCase(); sync(); schedule(); });
    picker.addEventListener("change", save);
    h.addEventListener("input", function () {
      var v = h.value.trim();
      if (v.charAt(0) !== "#") v = "#" + v;
      if (/^#[0-9a-f]{3}$/i.test(v)) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      if (hexOk(v)) { state[key] = v.toLowerCase(); changed(); }
    });
    h.addEventListener("blur", function () { h.value = state[key].toUpperCase(); });
  });
  $$("[data-auto]").forEach(function (el) {
    el.addEventListener("change", function () { state[el.getAttribute("data-auto") + "Auto"] = el.checked; changed(); });
  });
  $("[data-neutral]").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-value]");
    if (b) { state.neutralMode = b.getAttribute("data-value"); changed(); }
  });
  $("[data-target]").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-value]");
    if (b) { state.target = b.getAttribute("data-value"); changed(); }
  });
  $('[data-opt="exact"]').addEventListener("change", function (e) { state.exact = e.target.checked; changed(); });
  ["prefix", "pkg"].forEach(function (k) {
    $('[data-in="' + k + '"]').addEventListener("input", function (e) { state[k] = e.target.value.trim(); save(); schedule(); });
  });

  $("[data-code-tabs]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-view]");
    if (!b) return;
    state.view = b.getAttribute("data-view");
    save();
    renderCode();
  });

  var copyText = function (text, msg) {
    navigator.clipboard.writeText(text).then(function () { window.tkToast(msg); })
      .catch(function () { window.tkToast("Your browser blocked the clipboard", true); });
  };
  $("[data-copy-code]").addEventListener("click", function () { copyText($("[data-code]").textContent, "Copied " + viewFile(state.view).split("/").pop()); });
  $("[data-ramps]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-hex-copy]");
    if (b) copyText(b.getAttribute("data-hex-copy").toUpperCase(), b.getAttribute("data-hex-copy").toUpperCase() + " copied");
  });
  $('[data-copy="flutter"]').addEventListener("click", function () { copyText(X.flutter(), "Flutter colors copied"); });
  $('[data-copy="figma"]').addEventListener("click", function () { copyText(figmaSvg(), "Copied. Paste it into Figma as vector swatches"); });

  $('[data-export="zip"]').addEventListener("click", function () {
    try {
      var blob = window.tkZip(zipFiles());
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = p() + "-colors.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      window.tkToast(a.download + " downloaded");
    } catch (err) { window.tkToast("Couldn't create the ZIP", true); }
  });

  // ---------- Go ----------
  sync();
  update();
})();
