(function () {
  var GAME = 'blockfall', COLS = 10, ROWS = 20, LOCK_MS = 500, MAX_RESETS = 15;
  var TYPES = 'IOTSZJL';
  var COL = { I: '#3ef0ff', O: '#ffc83d', T: '#e86bff', S: '#7dff6b', Z: '#ff4d5e', J: '#4d6bff', L: '#ff9d3d' };
  var BASE = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  var LINE_PTS = [0, 100, 300, 500, 800];

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('board'), cx = cv.getContext('2d');
  var hv = $('hold'), hx = hv.getContext('2d');
  var nv = $('next'), nx = nv.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var cell = 24;

  var board, piece, held, canHold, queue, score, lines, level, state;
  var dropAcc, lockT, lockResets, softHeld, last = 0;

  /* ---------- helpers ---------- */
  function emptyBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null));
    return b;
  }
  function rotate(m, dir) {
    var n = m.length, out = [], r, c;
    for (r = 0; r < n; r++) { out.push([]); for (c = 0; c < n; c++) out[r][c] = dir > 0 ? m[n - 1 - c][r] : m[c][n - 1 - r]; }
    return out;
  }
  function collide(m, x, y) {
    for (var r = 0; r < m.length; r++) for (var c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      var bx = x + c, by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  }
  function newPiece(t) {
    var m = BASE[t].map(function (r) { return r.slice(); });
    return { t: t, m: m, x: Math.floor((COLS - m.length) / 2), y: t === 'I' ? -1 : 0 };
  }
  function nextType() {
    while (queue.length < 6) {
      var bag = TYPES.split('');
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
      queue = queue.concat(bag);
    }
    return queue.shift();
  }
  function gravity() { return Math.max(60, Math.round(800 * Math.pow(0.85, level - 1))); }
  function grounded() { return collide(piece.m, piece.x, piece.y + 1); }
  function touched() {
    if (grounded() && lockResets < MAX_RESETS) { lockT = 0; lockResets++; }
  }

  /* ---------- actions ---------- */
  function playing() { return state === 'play' && !HowTo.isOpen() && !Endgame.isOpen(); }
  function move(dx) {
    if (!playing()) return;
    if (!collide(piece.m, piece.x + dx, piece.y)) { piece.x += dx; touched(); }
  }
  function spin(dir) {
    if (!playing() || piece.t === 'O') return;
    var nm = rotate(piece.m, dir);
    var kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
    for (var i = 0; i < kicks.length; i++) {
      if (!collide(nm, piece.x + kicks[i][0], piece.y + kicks[i][1])) {
        piece.m = nm; piece.x += kicks[i][0]; piece.y += kicks[i][1];
        touched();
        return;
      }
    }
  }
  function spawn(t) {
    piece = newPiece(t);
    dropAcc = 0; lockT = 0; lockResets = 0;
    if (collide(piece.m, piece.x, piece.y)) gameOver();
  }
  function doHold() {
    if (!playing() || !canHold) return;
    var t = piece.t;
    var from = held;
    held = t;
    canHold = false;
    spawn(from || nextType());
  }
  function hardDrop() {
    if (!playing()) return;
    var d = 0;
    while (!collide(piece.m, piece.x, piece.y + 1)) { piece.y++; d++; }
    score += 2 * d;
    lockPiece();
  }
  function lockPiece() {
    var over = false;
    for (var r = 0; r < piece.m.length; r++) for (var c = 0; c < piece.m.length; c++) {
      if (!piece.m[r][c]) continue;
      var by = piece.y + r, bx = piece.x + c;
      if (by < 0) over = true; else board[by][bx] = piece.t;
    }
    var kept = board.filter(function (row) { return row.some(function (v) { return !v; }); });
    var cleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(null));
    board = kept;
    if (cleared) {
      score += LINE_PTS[cleared] * level;
      lines += cleared;
      level = 1 + Math.floor(lines / 10);
    }
    canHold = true;
    if (over) { gameOver(); return; }
    spawn(nextType());
  }
  function gameOver() {
    if (state === 'over') return;
    state = 'over';
    softHeld = false;
    Endgame.show({
      key: GAME, title: 'GAME OVER', color: '#ff7b8a',
      line: 'LEVEL ' + level + '  LINES ' + lines,
      score: score, delay: 500, onAgain: newGame
    });
  }
  function newGame() {
    board = emptyBoard();
    queue = []; held = null; canHold = true;
    score = 0; lines = 0; level = 1; softHeld = false;
    state = 'play';
    spawn(nextType());
  }

  /* ---------- loop ---------- */
  function frame(t) {
    var dt = Math.min(t - last, 100);
    last = t;
    if (playing()) {
      var g = softHeld ? Math.min(gravity(), 50) : gravity();
      if (grounded()) {
        dropAcc = 0;
        lockT += dt;
        if (lockT >= LOCK_MS) lockPiece();
      } else {
        lockT = 0;
        dropAcc += dt;
        while (dropAcc >= g && !grounded()) {
          dropAcc -= g;
          piece.y++;
          if (softHeld) score += 1;
        }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- drawing ---------- */
  function block(ctx, px, py, s, color, alpha) {
    var e = Math.max(2, Math.round(s * 0.12));
    ctx.globalAlpha = alpha || 1;
    ctx.fillStyle = color; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.fillRect(px, py, s, e); ctx.fillRect(px, py, e, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(px, py + s - e, s, e); ctx.fillRect(px + s - e, py, e, s);
    ctx.globalAlpha = 1;
  }
  function sizeCanvases() {
    var well = $('well'), screen = $('screen');
    var availW = well.clientWidth - 4, availH = screen.clientHeight - 24;
    cell = Math.max(12, Math.floor(Math.min(availW / COLS, availH / ROWS, 34)));
    var w = cell * COLS, h = cell * ROWS;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    [[hv, 64, 48], [nv, 64, 150]].forEach(function (a) {
      a[0].style.width = a[1] + 'px'; a[0].style.height = a[2] + 'px';
      a[0].width = Math.round(a[1] * dpr); a[0].height = Math.round(a[2] * dpr);
    });
  }
  function drawMini(ctx, t, cw, top, s) {
    var m = BASE[t], minr = 9, maxr = -1, minc = 9, maxc = -1, r, c;
    for (r = 0; r < m.length; r++) for (c = 0; c < m.length; c++) if (m[r][c]) {
      minr = Math.min(minr, r); maxr = Math.max(maxr, r); minc = Math.min(minc, c); maxc = Math.max(maxc, c);
    }
    var w = (maxc - minc + 1) * s, ox = Math.round((cw - w) / 2);
    for (r = minr; r <= maxr; r++) for (c = minc; c <= maxc; c++) if (m[r][c]) {
      block(ctx, ox + (c - minc) * s, top + (r - minr) * s, s, COL[t]);
    }
  }
  var shown = {};
  function setText(id, v) {
    var s = String(v);
    if (shown[id] !== s) { shown[id] = s; $(id).textContent = s; }
  }
  function draw() {
    var r, c;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, COLS * cell, ROWS * cell);
    cx.strokeStyle = 'rgba(122,121,187,.16)'; cx.lineWidth = 1;
    cx.beginPath();
    for (c = 1; c < COLS; c++) { cx.moveTo(c * cell + .5, 0); cx.lineTo(c * cell + .5, ROWS * cell); }
    for (r = 1; r < ROWS; r++) { cx.moveTo(0, r * cell + .5); cx.lineTo(COLS * cell, r * cell + .5); }
    cx.stroke();
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (board[r][c]) block(cx, c * cell, r * cell, cell, COL[board[r][c]]);
    if (piece && state === 'play') {
      var gy = piece.y;
      while (!collide(piece.m, piece.x, gy + 1)) gy++;
      for (r = 0; r < piece.m.length; r++) for (c = 0; c < piece.m.length; c++) if (piece.m[r][c]) {
        var py = gy + r;
        if (py >= 0) {
          cx.strokeStyle = COL[piece.t]; cx.globalAlpha = .55; cx.lineWidth = 2;
          cx.strokeRect((piece.x + c) * cell + 1, py * cell + 1, cell - 2, cell - 2);
          cx.globalAlpha = 1;
        }
      }
      for (r = 0; r < piece.m.length; r++) for (c = 0; c < piece.m.length; c++) if (piece.m[r][c]) {
        var y2 = piece.y + r;
        if (y2 >= 0) block(cx, (piece.x + c) * cell, y2 * cell, cell, COL[piece.t]);
      }
    }
    // hold + next
    hx.setTransform(dpr, 0, 0, dpr, 0, 0); hx.clearRect(0, 0, 64, 48);
    if (held) drawMini(hx, held, 64, 10, 12);
    nx.setTransform(dpr, 0, 0, dpr, 0, 0); nx.clearRect(0, 0, 64, 150);
    for (var i = 0; i < 4 && i < queue.length; i++) drawMini(nx, queue[i], 64, 8 + i * 35, 12);
    setText('s-score', score.toLocaleString());
    setText('s-lines', lines);
    setText('s-level', level);
  }

  /* ---------- input ---------- */
  function holdBtn(id, fn, opt) {
    var b = $(id), t1, t2;
    opt = opt || {};
    function stop() {
      clearTimeout(t1); clearInterval(t2);
      if (opt.up) opt.up();
    }
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      fn();
      if (opt.repeat) t1 = setTimeout(function () { t2 = setInterval(fn, opt.repeat); }, 170);
      if (opt.down) opt.down();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('click', function (e) { if (e.detail === 0) fn(); });
  }
  holdBtn('b-left', function () { move(-1); }, { repeat: 55 });
  holdBtn('b-right', function () { move(1); }, { repeat: 55 });
  holdBtn('b-down', function () {}, { down: function () { softHeld = true; }, up: function () { softHeld = false; } });
  holdBtn('b-rot', function () { spin(1); });
  holdBtn('b-hold', doHold);
  holdBtn('b-drop', hardDrop);

  function togglePause() {
    if (state !== 'play' || Endgame.isOpen()) return;
    if (HowTo.isOpen()) HowTo.close();
    else HowTo.show({ title: 'PAUSED', steps: ['Your game is on hold. Press RESUME to keep playing.'], button: 'RESUME' });
  }
  $('pause').addEventListener('click', togglePause);

  var HELP = [
    'Blocks fall from the top. Slide and rotate them to build solid rows with no gaps. A full row clears and scores points.',
    'LEFT, RIGHT and ROTATE steer the piece. Hold DOWN to fall faster. DROP slams it to the bottom. HOLD saves a piece for later (once per piece).',
    'The outline at the bottom shows where the piece will land. NEXT shows what is coming.',
    'The game speeds up every 10 rows. It ends when the stack reaches the top. On a keyboard: arrows, Space to drop, C to hold, P to pause.'
  ];
  $('help').addEventListener('click', function () {
    if (HowTo.isOpen()) return;
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
    if (!playing()) return;
    if (k === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (k === 'ArrowDown') { e.preventDefault(); softHeld = true; }
    else if (k === 'ArrowUp' || k === 'x' || k === 'X') { e.preventDefault(); if (!e.repeat) spin(1); }
    else if (k === 'z' || k === 'Z') { e.preventDefault(); if (!e.repeat) spin(-1); }
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) hardDrop(); }
    else if (k === 'c' || k === 'C' || k === 'Shift') { if (!e.repeat) doHold(); }
  });
  document.addEventListener('keyup', function (e) { if (e.key === 'ArrowDown') softHeld = false; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'play' && !HowTo.isOpen() && !Endgame.isOpen()) togglePause();
  });
  window.addEventListener('resize', sizeCanvases);

  Auth.require().then(function (s) {
    if (!s) return;
    sizeCanvases();
    newGame();
    requestAnimationFrame(function (t) { last = t; frame(t); });
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
