/* Scan test decoder. Runs jsQR off the main thread, so the page never
   stutters while you type (it was a 150–200 ms freeze on phones). */
importScripts("../vendor/jsQR.js");
postMessage({ ready: true });

onmessage = function (e) {
  var d = e.data;
  var res = self.jsQR(new Uint8ClampedArray(d.buf), d.w, d.h, { inversionAttempts: "attemptBoth" });
  postMessage({ id: d.id, bytes: res ? res.binaryData : null });
};
