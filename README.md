# Toolkit

Small, free tools for everyday design work, by [Greg Glias](https://gglias.github.io).

**Live:** https://gglias.github.io/toolkit/

Everything runs in your browser. Nothing you type or upload is sent anywhere: no accounts, no tracking, no server.

## Tools

- **QR code generator**: links, text, Wi-Fi, contacts (vCard), email, phone and SMS. Brand colours, dot and corner styles, a logo in the middle, and a built-in scan test that reads the code back. Exports SVG for print, PNG up to 4096 px, or copies a vector you can paste into Figma.

- **Favicon generator**: from a logo (SVG, PNG, JPG, WebP) or a few letters to `favicon.ico` (16/32/48), `icon.svg` (with an optional invert for dark tabs), the Apple touch icon, Android icons (including maskable) and `manifest.webmanifest`, plus the `<head>` code. Previews in light and dark browser tabs, phone home screens and a search result, with contrast checks. One ZIP, packed in the page.

More on the way: Greek → Latin slugs and a fluid type (`clamp()`) calculator.

## Built with

Plain HTML, CSS and JavaScript, hosted on GitHub Pages.

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) (MIT) draws the codes
- [jsQR](https://github.com/cozmo/jsQR) (Apache 2.0) reads them back for the scan test

Both are kept in `vendor/` with their licences, so the site never loads code from another server.
