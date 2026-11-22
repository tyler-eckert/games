/* Eckerthaus Arcade service worker: makes the whole arcade playable offline.
   - App files are cached on install and kept fresh: network first (3s), cache when offline.
   - The Supabase library and the pixel font are cached after the first online visit.
   - Supabase API calls (sign-in, scores, races) are never cached. */
var CACHE = 'arcade-offline-v1';
var APP = [
 "/",
 "/blockfall/",
 "/blockfall/game.js",
 "/blockfall/index.html",
 "/blockfall/style.css",
 "/brickbounce/",
 "/brickbounce/game.js",
 "/brickbounce/index.html",
 "/brickbounce/style.css",
 "/codebreaker/",
 "/codebreaker/game.js",
 "/codebreaker/index.html",
 "/css/arcade.css",
 "/favicon.ico",
 "/ginrummy/",
 "/ginrummy/engine.js",
 "/ginrummy/game.js",
 "/ginrummy/index.html",
 "/ginrummy/style.css",
 "/hangman/",
 "/hangman/game.js",
 "/hangman/index.html",
 "/hangman/style.css",
 "/hangman/words.js",
 "/icons/apple-touch-icon.png",
 "/icons/favicon-32.png",
 "/icons/icon-192.png",
 "/icons/icon-512.png",
 "/icons/icon.svg",
 "/index.html",
 "/js/auth.js",
 "/js/config.js",
 "/js/endgame.js",
 "/js/howto.js",
 "/js/scores.js",
 "/kids/",
 "/kids/core.js",
 "/kids/family.js",
 "/kids/index.html",
 "/kids/lang.js",
 "/kids/math.js",
 "/kids/sci.js",
 "/kids/style.css",
 "/kids/sudoku4.js",
 "/leaderboard.html",
 "/login.html",
 "/manifest.webmanifest",
 "/minesweeper/",
 "/minesweeper/game.js",
 "/minesweeper/index.html",
 "/solitaire/",
 "/solitaire/game.js",
 "/solitaire/index.html",
 "/solitaire/style.css",
 "/sudoku/",
 "/sudoku/engine.js",
 "/sudoku/game.js",
 "/sudoku/index.html",
 "/sudoku/style.css",
 "/wahoo/",
 "/wahoo/game.js",
 "/wahoo/index.html",
 "/wahoo/style.css",
 "/wheel/",
 "/wheel/game.js",
 "/wheel/index.html",
 "/wheel/puzzles.js",
 "/wheel/style.css"
];
var CDN = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(APP.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })
      .concat(CDN.map(function (u) { return fetch(u).then(function (r) { return c.put(u, r); }).catch(function () {}); })));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req, ms) {
  return new Promise(function (resolve) {
    var done = false;
    function fallback() { caches.match(req, { ignoreSearch: true }).then(function (m) { if (!done) { done = true; resolve(m || Response.error()); } }); }
    var t = setTimeout(fallback, ms);
    fetch(req).then(function (r) {
      clearTimeout(t);
      if (r && (r.ok || r.type === 'opaque')) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      if (!done) { done = true; resolve(r); }
    }).catch(function () { clearTimeout(t); fallback(); });
  });
}
function cacheFirst(req) {
  return caches.match(req).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) { e.respondWith(networkFirst(req, 3000)); return; }
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
