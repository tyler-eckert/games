/* Sliding Tiles: 3x3, 4x4 or 5x5. Tiles are numbered by home position; 0 is the gap, which belongs bottom-right.
   Boards are shuffled by walking legal moves backwards from the solved state, so every board can be solved. */
(function () {
  'use strict';
  var COLS = ['#ff4d5e', '#ffc83d', '#7dff6b', '#3ef0ff', '#e86bff'];
  var BASE = { 3: 600, 4: 1500, 5: 3000 };
  var cfg = { size: 3, face: 'pic' };
  function $(id) { return document.getElementById(id); }

  /* A small neon pixel scene (night sky, moon, hills, grid road) used for the picture faces. */
  function scene() {
    var r = [], k, x, y;
    r.push('<rect width="32" height="32" fill="#150f3d"/>');
    for (y = 0; y < 14; y++) r.push('<rect y="' + y + '" width="32" height="1" fill="' + ['#150f3d', '#1c1250', '#26165f', '#341a6b', '#4a1f78', '#6a2681', '#8e2f88'][Math.min(6, Math.floor(y / 2))] + '"/>');
    var stars = [[3, 2], [9, 5], [14, 1], [21, 3], [28, 6], [25, 1], [6, 8], [18, 7], [30, 10], [1, 11]];
    stars.forEach(function (s) { r.push('<rect x="' + s[0] + '" y="' + s[1] + '" width="1" height="1" fill="#fff"/>'); });
    r.push('<circle cx="22" cy="10" r="6" fill="#ffc83d"/><circle cx="24" cy="9" r="5" fill="#ffe28a"/>');
    r.push('<path d="M0 20 L6 12 L11 17 L17 9 L24 18 L28 14 L32 19 V22 H0Z" fill="#2a2a7a"/>');
    r.push('<path d="M0 22 L5 17 L10 22 L16 15 L22 22 L27 18 L32 22 V24 H0Z" fill="#3ef0ff" opacity=".85"/>');
    r.push('<rect y="22" width="32" height="10" fill="#0b0a1f"/><rect y="22" width="32" height="1" fill="#ff7be8"/>');
    for (k = 0; k <= 8; k++) r.push('<line x1="' + (16 + (k - 4) * 1.2) + '" y1="22" x2="' + (16 + (k - 4) * 6) + '" y2="32" stroke="#ff7be8" stroke-width=".35"/>');
    [24, 26, 29].forEach(function (yy) { r.push('<line x1="0" y1="' + yy + '" x2="32" y2="' + yy + '" stroke="#ff7be8" stroke-width=".35"/>'); });
    r.push('<rect x="14" y="19" width="4" height="2" fill="#7dff6b"/><rect x="15" y="18" width="2" height="1" fill="#7dff6b"/>');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges" preserveAspectRatio="none">' + r.join('') + '</svg>';
  }
  var IMG = 'url("data:image/svg+xml,' + encodeURIComponent(scene()) + '")';

  var n, grid, undo, moves, t0, tick, over, tiles, startAt;

  function solved() { for (var k = 0; k < n * n - 1; k++) if (grid[k] !== k + 1) return false; return true; }
  function shuffled(sz) {
    var g = [], k, gap, prev = -1, steps = sz * sz * 40, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (k = 0; k < sz * sz - 1; k++) g.push(k + 1); g.push(0); gap = sz * sz - 1;
    for (k = 0; k < steps || isSolved(g, sz); k++) {
      var r = Math.floor(gap / sz), c = gap % sz, opts = [];
      dirs.forEach(function (d) { var rr = r + d[0], cc = c + d[1]; if (rr >= 0 && rr < sz && cc >= 0 && cc < sz && rr * sz + cc !== prev) opts.push(rr * sz + cc); });
      var to = opts[Math.floor(Math.random() * opts.length)];
      g[gap] = g[to]; g[to] = 0; prev = gap; gap = to;
    }
    return g;
  }
  function isSolved(g, sz) { for (var k = 0; k < sz * sz - 1; k++) if (g[k] !== k + 1) return false; return true; }

  function build() {
    var b = $('board'); b.textContent = ''; b.className = 'sl-board'; tiles = {};
    var pct = 100 / n;
    for (var v = 0; v < n * n; v++) {
      var t = document.createElement('button'); t.type = 'button'; t.className = 'sl-t' + (cfg.face === 'num' ? ' num' : '') + (v === 0 ? ' gap' : '');
      var home = (v === 0 ? n * n : v) - 1, hr = Math.floor(home / n), hc = home % n;
      t.style.width = pct + '%'; t.style.height = pct + '%';
      var s = document.createElement('span');
      s.style.setProperty('--c', COLS[(hr + hc) % 5]);
      s.style.backgroundImage = IMG; s.style.backgroundSize = (n * 100) + '% ' + (n * 100) + '%';
      s.style.backgroundPosition = (n > 1 ? hc * 100 / (n - 1) : 0) + '% ' + (n > 1 ? hr * 100 / (n - 1) : 0) + '%';
      if (v) { s.textContent = ''; var i = document.createElement('i'); i.textContent = String(v); s.appendChild(i); if (cfg.face === 'num') { s.firstChild.remove(); s.textContent = String(v); } }
      t.appendChild(s);
      (function (v) { t.addEventListener('click', function () { tap(grid.indexOf(v)); }); })(v);
      if (v) t.setAttribute('aria-label', 'Tile ' + v);
      b.appendChild(t); tiles[v] = t;
    }
    var gh = document.createElement('div'); gh.className = 'sl-ghost'; gh.id = 'ghost'; gh.style.backgroundImage = IMG; b.appendChild(gh);
  }
  function place() {
    var pct = 100 / n;
    for (var k = 0; k < grid.length; k++) { var t = tiles[grid[k]]; t.style.left = (k % n) * pct + '%'; t.style.top = Math.floor(k / n) * pct + '%'; }
    $('mv').textContent = 'MOVES ' + moves;
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function clock() { if (!over && t0) $('tm').textContent = 'TIME ' + fmt(Math.floor((Date.now() - t0) / 1000)); }

  function begin() {
    n = cfg.size; if (window.Auth && Auth.play) Auth.play('slide-' + n, { now: true });
    grid = shuffled(n); undo = []; moves = 0; over = false; t0 = 0;
    $('setup').hidden = true; $('game').hidden = false; $('msg').textContent = 'TAP A TILE NEXT TO THE GAP.';
    $('tm').textContent = 'TIME 0:00'; build(); place();
    clearInterval(tick); tick = setInterval(clock, 500);
  }
  function tap(idx) {
    if (over || idx < 0) return;
    var gap = grid.indexOf(0), gr = Math.floor(gap / n), gc = gap % n, r = Math.floor(idx / n), c = idx % n;
    if (idx === gap || (r !== gr && c !== gc)) return;
    if (!t0) t0 = Date.now();
    undo.push(grid.slice());
    var step = r === gr ? (c > gc ? 1 : -1) : (r > gr ? n : -n), p = gap;
    while (p !== idx) { grid[p] = grid[p + step]; p += step; }
    grid[idx] = 0; moves++; place();
    if (solved()) win();
  }
  function win() {
    over = true; clearInterval(tick);
    var secs = Math.floor((Date.now() - t0) / 1000), score = Math.max(10, BASE[n] - moves * 3 - secs);
    $('board').classList.add('done'); tiles[0].classList.add('fill'); $('ghost').classList.remove('on');
    $('msg').textContent = 'SOLVED IN ' + moves + ' MOVES!';
    setTimeout(function () {
      Endgame.show({ key: 'slide-' + n, title: 'SOLVED!', color: '#7dff6b', line: moves + ' MOVES IN ' + fmt(secs), score: score, delay: 500, onAgain: showSetup });
    }, 900);
  }
  function showSetup() { over = true; clearInterval(tick); $('game').hidden = true; $('setup').hidden = false; }

  $('undo').addEventListener('click', function () { if (over || !undo.length) return; grid = undo.pop(); moves++; place(); });
  $('redo').addEventListener('click', function () { begin(); });
  var peek = $('peek'); function show(on) { var g = $('ghost'); if (g) g.classList.toggle('on', on); }
  peek.addEventListener('pointerdown', function () { show(true); });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (e) { peek.addEventListener(e, function () { show(false); }); });
  peek.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') show(true); });
  peek.addEventListener('keyup', function () { show(false); });
  document.addEventListener('keydown', function (e) {
    if (over || $('game').hidden) return;
    var gap = grid.indexOf(0), r = Math.floor(gap / n), c = gap % n, to = -1;
    if (e.key === 'ArrowLeft' && c < n - 1) to = gap + 1;
    else if (e.key === 'ArrowRight' && c > 0) to = gap - 1;
    else if (e.key === 'ArrowUp' && r < n - 1) to = gap + n;
    else if (e.key === 'ArrowDown' && r > 0) to = gap - n;
    if (to > -1) { e.preventDefault(); tap(to); }
  });
  function seg(id, key, num) {
    var s = $(id);
    Array.prototype.forEach.call(s.children, function (b) {
      b.addEventListener('click', function () { cfg[key] = num ? +b.dataset.n : b.dataset.n; Array.prototype.forEach.call(s.children, function (x) { x.classList.toggle('on', x === b); }); });
    });
  }
  seg('size', 'size', true); seg('face', 'face', false);
  $('start').addEventListener('click', begin);
  $('help').addEventListener('click', function () {
    HowTo.show({ title: 'HOW TO PLAY SLIDING TILES', steps: [
      'Tap a tile next to the empty gap to slide it in. Tap a tile further along the same row or column to slide the whole line.',
      'Put the tiles back in order: 1, 2, 3 and so on, with the gap in the bottom-right corner. In picture mode, rebuild the scene.',
      'Hold PEEK to see the finished picture. UNDO takes back your last move, but it still counts as a move.',
      'Your score is a base for the board size, minus a little for every move and every second. Each size has its own leaderboard.',
      'On a keyboard, the arrow keys slide a tile into the gap.'
    ] });
  });
  Auth.require();
})();
