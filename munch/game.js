/* Maze Munch: a chomp-and-dodge maze game for 1 player, or 2 to 4 online together.
   Everyone is a chomper in the same maze. Eat every dot, grab power dots to turn the ghosts blue, and share three lives.
   Online play: the host runs the game and sends snapshots; guests send only their direction. */
(function () {
  'use strict';
  var GAME = 'munch', W = 19, H = 21, T = 20;
  var MAZE = ["###################", "#........#........#", "#o###.##.#.##.###o#", "#.................#", "#.###.#.###.#.###.#", "#.....#.....#.....#", "#####.###.###.#####", "#####.#.....#.#####", "#####..##-##..#####", " ......#HHH#...... ", "#####..#####..#####", "#####.#.....#.#####", "#####.###.###.#####", "#.................#", "#.###.##.#.##.###.#", "#o..#.........#..o#", "###.#.#.###.#.#.###", "#.....#.....#.....#", "#.#######.#######.#", "#.................#", "###################"];
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  var PCOL = ['#ffd23d', '#7dff6b', '#b48cff', '#ffffff'];
  var GCOL = ['#ff4d5e', '#ff9bd8', '#3ef0ff', '#ffb347'];
  var PSP = [[9, 15], [7, 15], [11, 15], [5, 15]];
  var CORNER = [[17, 1], [1, 1], [17, 19], [1, 19]];
  var PEN = [[8, 9], [10, 9], [9, 9]];
  var DOOR = [9, 7];
  var wall = new Uint8Array(W * H), basePel = new Uint8Array(W * H), totalDots = 0;
  (function () {
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) {
      var ch = MAZE[r][c], i = r * W + c;
      wall[i] = (ch === '#' || ch === 'H' || ch === '-') ? 1 : 0;
      if (ch === '.') { basePel[i] = 1; totalDots++; } else if (ch === 'o') { basePel[i] = 2; totalDots++; }
    }
  })();
  function walk(c, r) { c = ((c % W) + W) % W; return r >= 0 && r < H && !wall[r * W + c]; }
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = mk('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function shuffle(a) { a = a.slice(); for (var k = a.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = a[k]; a[k] = a[r]; a[r] = t; } return a; }
  function opp(d) { return (d + 2) % 4; }

  /* ---------- game state (solo and host) ---------- */
  var S = null, role = 'solo', net = null, me = 0, gid = 0, over = false;

  function ghostSpeed(l) { return Math.min(6.1, 4.9 + 0.25 * (l - 1)); }
  function scareTime(l) { return Math.max(2.5, 7 - 0.5 * (l - 1)); }
  function newPlayer(i, uid, name) {
    return { i: i, uid: uid, name: name, color: PCOL[i], x: PSP[i][0], y: PSP[i][1], dir: -1, want: -1, alive: true, respawn: 0, inv: 0, score: 0 };
  }
  function resetActors() {
    S.players.forEach(function (p) { p.x = PSP[p.i][0]; p.y = PSP[p.i][1]; p.dir = -1; p.want = -1; p.alive = true; p.respawn = 0; p.inv = 0; });
    S.ghosts = [];
    for (var k = 0; k < 4; k++) {
      var g = { i: k, x: DOOR[0], y: DOOR[1], dir: k === 0 ? 3 : -1, mode: k === 0 ? 'go' : 'pen', pt: k === 0 ? 0 : [0, 3, 6][k - 1] * Math.max(0.4, 1 - 0.1 * (S.level - 1)), px: PEN[(k + 2) % 3][0], py: 9 };
      if (g.mode === 'pen') { g.x = g.px; g.y = g.py; }
      S.ghosts.push(g);
    }
    S.scared = 0; S.combo = 0; S.cycle = 0;
  }
  function loadPellets() { S.pel = new Uint8Array(basePel); S.left = totalDots; S.full = true; }
  function newState(list) {
    S = { players: list, level: 1, lives: 3, pel: null, left: 0, ghosts: [], scared: 0, combo: 0, cycle: 0, phase: 'ready', t: 3, eaten: [], full: true, clear: 0 };
    loadPellets(); resetActors();
  }

  /* generic mover: advances an entity along the grid; pick(e, col, row) chooses the direction at tile centres (or -1 to stop) */
  function move(e, speed, dt, pick) {
    var d = speed * dt, guard = 0;
    while (d > 1e-6 && guard++ < 8) {
      var cx = Math.round(e.x), cy = Math.round(e.y);
      var atC = Math.abs(e.x - cx) < 1e-4 && Math.abs(e.y - cy) < 1e-4;
      if (atC) {
        e.x = cx; e.y = cy;
        if (e.x < 0) e.x += W; if (e.x >= W) e.x -= W;
        var nd = pick(e, ((cx % W) + W) % W, cy);
        e.dir = nd;
        if (nd < 0) return;
      }
      if (e.dir < 0) return;
      var dv = DIRS[e.dir], dist;
      if (dv[0] !== 0) { var nc = dv[0] > 0 ? Math.floor(e.x + 1e-4) + 1 : Math.ceil(e.x - 1e-4) - 1; dist = Math.abs(nc - e.x); }
      else { var nr = dv[1] > 0 ? Math.floor(e.y + 1e-4) + 1 : Math.ceil(e.y - 1e-4) - 1; dist = Math.abs(nr - e.y); }
      var s = Math.min(d, dist);
      e.x += dv[0] * s; e.y += dv[1] * s; d -= s;
      if (e.x < -0.5) e.x += W; if (e.x > W - 0.5) e.x -= W;
    }
  }
  function pickPlayer(p, c, r) {
    if (p.want >= 0 && walk(c + DIRS[p.want][0], r + DIRS[p.want][1])) return p.want;
    if (p.dir >= 0 && walk(c + DIRS[p.dir][0], r + DIRS[p.dir][1])) return p.dir;
    return -1;
  }
  function setWant(p, d) {
    if (!p || !p.alive) return;
    p.want = d;
    // reversing between tiles is always allowed
    if (p.dir >= 0 && d === opp(p.dir)) p.dir = d;
  }
  function nearest(g) {
    var best = null, bd = 1e9;
    S.players.forEach(function (p) { if (!p.alive) return; var d = Math.pow(p.x - g.x, 2) + Math.pow(p.y - g.y, 2); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  function targetFor(g, scatter) {
    var p = nearest(g), home = CORNER[g.i];
    if (!p || scatter) return home;
    var dv = p.dir >= 0 ? DIRS[p.dir] : [0, 0];
    if (g.i === 0) return [p.x, p.y];
    if (g.i === 1) return [p.x + 4 * dv[0], p.y + 4 * dv[1]];
    if (g.i === 2) { var g0 = S.ghosts[0]; return [2 * (p.x + 2 * dv[0]) - g0.x, 2 * (p.y + 2 * dv[1]) - g0.y]; }
    return Math.hypot(p.x - g.x, p.y - g.y) > 8 ? [p.x, p.y] : home;
  }
  function pickGhost(g, c, r) {
    var opts = [], d;
    for (d = 0; d < 4; d++) {
      if (g.dir >= 0 && d === opp(g.dir)) continue;
      if (walk(c + DIRS[d][0], r + DIRS[d][1])) opts.push(d);
    }
    if (!opts.length) return g.dir >= 0 ? opp(g.dir) : -1;
    if (S.scared > 0) return opts[Math.floor(Math.random() * opts.length)];
    var scatter = (S.cycle % 27) < Math.max(2, 7 - S.level), t = targetFor(g, scatter), best = opts[0], bd = 1e9;
    opts.forEach(function (o) {
      var nx = c + DIRS[o][0], ny = r + DIRS[o][1], dd = Math.pow(t[0] - nx, 2) + Math.pow(t[1] - ny, 2);
      if (dd < bd) { bd = dd; best = o; }
    });
    return best;
  }

  function eatAt(p) {
    var c = Math.round(p.x), r = Math.round(p.y);
    if (Math.abs(p.x - c) > 0.35 || Math.abs(p.y - r) > 0.35) return;
    c = ((c % W) + W) % W;
    var i = r * W + c, v = S.pel[i];
    if (!v) return;
    S.pel[i] = 0; S.left--; S.eaten.push(i);
    p.score += v === 2 ? 50 : 10;
    if (v === 2) {
      S.scared = scareTime(S.level); S.combo = 0;
      S.ghosts.forEach(function (g) { if (g.mode === 'go' && g.dir >= 0) g.dir = opp(g.dir); });
    }
  }
  function killPlayer(p) {
    p.alive = false; p.respawn = 2.2; p.dir = -1; p.want = -1;
    S.lives--;
    if (S.lives <= 0) { S.phase = 'over'; S.t = 1.2; }
  }
  function collide() {
    S.players.forEach(function (p) {
      if (!p.alive) return;
      S.ghosts.forEach(function (g) {
        if (g.mode !== 'go') return;
        if (Math.hypot(p.x - g.x, p.y - g.y) > 0.6) return;
        if (S.scared > 0) {
          p.score += 200 * Math.pow(2, Math.min(S.combo, 3)); S.combo++;
          g.mode = 'pen'; g.pt = 3; g.x = g.px; g.y = g.py; g.dir = -1;
        } else if (p.inv <= 0) killPlayer(p);
      });
    });
  }
  function nextLevel() {
    S.level++; loadPellets(); resetActors(); S.phase = 'ready'; S.t = 2.2;
  }
  function update(dt) {
    if (!S) return;
    if (S.phase === 'ready') { S.t -= dt; if (S.t <= 0) S.phase = 'play'; return; }
    if (S.phase === 'clear') { S.t -= dt; if (S.t <= 0) nextLevel(); return; }
    if (S.phase === 'over') { S.t -= dt; return; }
    S.cycle += dt;
    if (S.scared > 0) { S.scared -= dt; if (S.scared <= 0) { S.scared = 0; S.combo = 0; } }
    S.players.forEach(function (p) {
      if (p.gone) return;
      if (!p.alive) { p.respawn -= dt; if (p.respawn <= 0 && S.lives > 0) { p.alive = true; p.x = PSP[p.i][0]; p.y = PSP[p.i][1]; p.dir = -1; p.want = -1; p.inv = 2.5; } return; }
      if (p.inv > 0) p.inv -= dt;
      move(p, 6.0, dt, pickPlayer);
      eatAt(p);
    });
    S.ghosts.forEach(function (g) {
      if (g.mode === 'pen') { g.pt -= dt; if (g.pt <= 0) { g.mode = 'go'; g.x = DOOR[0]; g.y = DOOR[1]; g.dir = Math.random() < 0.5 ? 1 : 3; } return; }
      move(g, S.scared > 0 ? 3.2 : ghostSpeed(S.level), dt, pickGhost);
    });
    collide();
    if (S.left <= 0 && S.phase === 'play') { S.phase = 'clear'; S.t = 2; S.players.forEach(function (p) { p.score += 100 * S.level; }); }
  }

  /* ---------- drawing ---------- */
  var cv = $('cv'), g2 = cv.getContext('2d'), mazeCv = document.createElement('canvas');
  cv.width = W * T; cv.height = H * T; mazeCv.width = W * T; mazeCv.height = H * T;
  (function buildMaze() {
    var m = mazeCv.getContext('2d'), r, c;
    m.fillStyle = '#07061a'; m.fillRect(0, 0, W * T, H * T);
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      var ch = MAZE[r][c];
      if (ch === '#') { m.fillStyle = '#17155c'; m.fillRect(c * T, r * T, T, T); }
      else if (ch === 'H') { m.fillStyle = '#0d0c33'; m.fillRect(c * T, r * T, T, T); }
    }
    m.strokeStyle = '#5b6bff'; m.lineWidth = 2; m.lineCap = 'round';
    function solid(c, r) { return r >= 0 && r < H && c >= 0 && c < W && MAZE[r][c] === '#'; }
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      if (MAZE[r][c] !== '#') continue;
      var x = c * T, y = r * T;
      m.beginPath();
      if (!solid(c, r - 1) && !(r === 0)) { m.moveTo(x, y + 1); m.lineTo(x + T, y + 1); }
      if (!solid(c, r + 1) && !(r === H - 1)) { m.moveTo(x, y + T - 1); m.lineTo(x + T, y + T - 1); }
      if (!solid(c - 1, r) && c > 0) { m.moveTo(x + 1, y); m.lineTo(x + 1, y + T); }
      if (!solid(c + 1, r) && c < W - 1) { m.moveTo(x + T - 1, y); m.lineTo(x + T - 1, y + T); }
      m.stroke();
    }
    m.strokeStyle = '#ff9bd8'; m.lineWidth = 3; m.beginPath(); m.moveTo(8 * T + 2, 8 * T + T / 2); m.lineTo(11 * T - 2, 8 * T + T / 2); m.stroke();
  })();
  var face = [1, 1, 1, 1], clock = 0;
  function drawChomper(p, isMe) {
    var px = (p.x + 0.5) * T, py = (p.y + 0.5) * T, a;
    if (p.dir >= 0) face[p.i] = p.dir;
    a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][face[p.i]];
    var mouth = p.dir >= 0 ? 0.08 + 0.3 * Math.abs(Math.sin(clock * 12 + p.i)) : 0.12;
    if (p.inv > 0 && Math.floor(clock * 10) % 2) g2.globalAlpha = 0.45;
    g2.fillStyle = p.color; g2.beginPath(); g2.moveTo(px, py);
    g2.arc(px, py, T * 0.43, a + mouth * Math.PI, a + (2 - mouth) * Math.PI); g2.closePath(); g2.fill();
    g2.globalAlpha = 1;
    if (isMe && net) { g2.fillStyle = '#fff'; g2.beginPath(); g2.moveTo(px, py - T * 0.62); g2.lineTo(px - 4, py - T * 0.9); g2.lineTo(px + 4, py - T * 0.9); g2.closePath(); g2.fill(); }
  }
  function drawGhost(g, scared, flash) {
    var px = (g.x + 0.5) * T, py = (g.y + 0.5) * T, r = T * 0.44;
    if (g.mode === 'pen') g2.globalAlpha = 0.45;
    g2.fillStyle = scared ? (flash && Math.floor(clock * 6) % 2 ? '#ffffff' : '#2b3cff') : GCOL[g.i];
    g2.beginPath(); g2.arc(px, py - 1, r, Math.PI, 0); g2.lineTo(px + r, py + r);
    var k, n = 3, w = (2 * r) / n;
    for (k = 0; k < n; k++) { g2.lineTo(px + r - w * (k + 0.5), py + r - 4); g2.lineTo(px + r - w * (k + 1), py + r); }
    g2.closePath(); g2.fill();
    var dv = g.dir >= 0 ? DIRS[g.dir] : [0, 0];
    [-1, 1].forEach(function (s) {
      g2.fillStyle = scared ? '#ffe0e0' : '#fff'; g2.beginPath(); g2.arc(px + s * 4, py - 3, 3.2, 0, 7); g2.fill();
      g2.fillStyle = scared ? '#d33' : '#1a2cff'; g2.beginPath(); g2.arc(px + s * 4 + dv[0] * 1.4, py - 3 + dv[1] * 1.4, 1.6, 0, 7); g2.fill();
    });
    g2.globalAlpha = 1;
  }
  function draw(V) {
    clock = performance.now() / 1000;
    g2.drawImage(mazeCv, 0, 0);
    var i, p;
    for (i = 0; i < V.pel.length; i++) {
      if (!V.pel[i]) continue;
      var c = i % W, r = (i - c) / W, x = (c + 0.5) * T, y = (r + 0.5) * T;
      g2.fillStyle = '#ffd9a8';
      if (V.pel[i] === 2) { if (Math.floor(clock * 4) % 2) continue; g2.beginPath(); g2.arc(x, y, 5.5, 0, 7); g2.fill(); }
      else g2.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    V.players.forEach(function (q, k) { if (q.alive) drawChomper(q, k === me); });
    V.ghosts.forEach(function (gh) { drawGhost(gh, V.scared > 0 && gh.mode === 'go', V.scared > 0 && V.scared < 2); });
    if (V.phase === 'ready' || V.phase === 'clear' || V.phase === 'over') {
      g2.fillStyle = 'rgba(7,6,26,.55)'; g2.fillRect(0, 9 * T + 4, W * T, 3 * T - 8);
      g2.fillStyle = V.phase === 'over' ? '#ff7b8a' : V.phase === 'clear' ? '#7dff6b' : '#ffd23d';
      g2.font = '16px "Press Start 2P", monospace'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillText(V.phase === 'over' ? 'GAME OVER' : V.phase === 'clear' ? 'LEVEL CLEARED' : 'LEVEL ' + V.level + '  READY', W * T / 2, 10.5 * T);
    }
  }

  /* ---------- HUD ---------- */
  var hudKey = '';
  function paintHud(V) {
    var key = V.players.map(function (p) { return p.score; }).join(',') + '|' + V.lives + '|' + V.level;
    if (key === hudKey) return; hudKey = key;
    var h = $('hud'); h.textContent = '';
    var top = mk('div', 'mm-top'); top.appendChild(mk('span', '', 'LEVEL ' + V.level));
    var lv = mk('span', 'mm-lives'); for (var k = 0; k < 3; k++) { var d = mk('i', k < V.lives ? 'on' : ''); lv.appendChild(d); }
    top.appendChild(lv); h.appendChild(top);
    var row = mk('div', 'mm-chips');
    V.players.forEach(function (p, i) {
      var c = mk('div', 'chip' + (i === me ? ' me' : ''));
      var dot = mk('b'); dot.style.background = p.color; c.appendChild(dot);
      c.appendChild(mk('span', '', (i === me ? (net ? 'YOU' : 'SCORE') : p.name)));
      c.appendChild(mk('em', '', String(p.score)));
      row.appendChild(c);
    });
    h.appendChild(row);
  }

  /* ---------- input ---------- */
  var KEYDIR = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  var lastSent = -1;
  function steer(d) {
    if (over || !S && role !== 'guest') return;
    if (role === 'guest') {
      if (net && d !== lastSent) { lastSent = d; net.ch.send({ type: 'broadcast', event: 'in', payload: { uid: net.uid, d: d } }); }
      return;
    }
    setWant(S.players[me], d);
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'INPUT') return;
    if (e.key in KEYDIR) { e.preventDefault(); steer(KEYDIR[e.key]); }
  });
  [['up', 0], ['right', 1], ['down', 2], ['left', 3]].forEach(function (a) {
    var b = $('mm-' + a[0]);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); steer(a[1]); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
  (function swipe() {
    var sx, sy, t0;
    cv.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); }, { passive: true });
    cv.addEventListener('touchmove', function (e) {
      if (sx === undefined) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    cv.addEventListener('touchend', function () { sx = undefined; }, { passive: true });
  })();

  /* ---------- main loop ---------- */
  var G = null, acc = 0, last = 0, snapAcc = 0, snapN = 0, hudAcc = 0, raf = 0;
  function r2(v) { return Math.round(v * 100) / 100; }
  function view() {
    if (role !== 'guest') return S;
    if (!G || !G.cur) return null;
    var a = Math.max(0, Math.min(1, (performance.now() - G.at) / 125)), pv = G.prev, cu = G.cur;
    function lerp(p, c, k) { return Math.abs(c - p) > 3 ? c : p + (c - p) * k; }
    G.players.forEach(function (p, i) {
      var s = cu.p[i], o = pv.p[i] || s; if (!s) return;
      p.x = lerp(o[0], s[0], a); p.y = lerp(o[1], s[1], a); p.dir = s[2]; p.alive = !!s[3]; p.score = s[4]; p.inv = s[5] ? 1 : 0;
    });
    G.ghosts.forEach(function (g, i) {
      var s = cu.g[i], o = pv.g[i] || s; if (!s) return;
      g.x = lerp(o[0], s[0], a); g.y = lerp(o[1], s[1], a); g.dir = s[2]; g.mode = s[3] ? 'go' : 'pen';
    });
    return G;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (role !== 'guest' && S) {
      acc += dt;
      while (acc >= 1 / 60) { update(1 / 60); acc -= 1 / 60; }
      if (net && net.host) {
        snapAcc += dt;
        if (snapAcc >= 0.125) { snapAcc = 0; sendSnap(); }
      }
      if (S.phase === 'over' && S.t <= 0 && !over) finishHost();
    }
    var V = view(); if (!V) return;
    draw(V);
    hudAcc += dt; if (hudAcc > 0.1) { hudAcc = 0; paintHud(V); }
  }
  function startLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function showGame() { $('setup').hidden = true; $('game').hidden = false; hudKey = ''; }
  function showSetup() {
    gid++; over = true; S = null; G = null; leaveNet(); $('game').hidden = true; $('setup').hidden = false;
  }
  function startSolo() {
    leaveNet(); role = 'solo'; me = 0; over = false; lastSent = -1; acc = 0;
    Auth.session().then(function (s) {
      newState([newPlayer(0, s ? s.user.id : 'me', 'YOU')]);
      if (window.Auth && Auth.play) Auth.play(GAME, { now: true });
      showGame(); startLoop();
    });
  }
  function finish(score, line) {
    if (over) return; over = true;
    var g = gid;
    setTimeout(function () {
      if (g !== gid) return;
      Endgame.show({ key: GAME, title: 'GAME OVER', color: '#ffd23d', line: line, score: score, delay: 200, onAgain: showSetup });
    }, 300);
  }
  function finishHost() {
    var list = S.players.map(function (p) { return [p.uid, p.name, p.score]; });
    if (net) net.ch.send({ type: 'broadcast', event: 'over', payload: { scores: list, level: S.level } });
    var mine = S.players[me].score;
    finish(mine, 'LEVEL ' + S.level + (S.players.length > 1 ? '  TEAM ' + list.reduce(function (a, x) { return a + x[2]; }, 0) : ''));
  }
  $('start').addEventListener('click', startSolo);

  /* ---------- online ---------- */
  function sendSnap() {
    var m = {
      p: S.players.map(function (p) { return [r2(p.x), r2(p.y), p.dir, p.alive ? 1 : 0, p.score, p.inv > 0 ? 1 : 0]; }),
      g: S.ghosts.map(function (g) { return [r2(g.x), r2(g.y), g.dir, g.mode === 'pen' ? 0 : 1]; }),
      e: S.eaten, s: r2(S.scared), l: S.lives, v: S.level, h: S.phase
    };
    snapN++; if (S.full || snapN % 16 === 0) { m.f = Array.prototype.join.call(S.pel, ''); S.full = false; }
    S.eaten = [];
    net.ch.send({ type: 'broadcast', event: 'snap', payload: m });
  }
  function applySnap(m) {
    if (!G) return;
    if (m.f) for (var k = 0; k < m.f.length && k < G.pel.length; k++) G.pel[k] = +m.f[k];
    (m.e || []).forEach(function (i) { G.pel[i] = 0; });
    G.prev = G.cur || m; G.cur = m; G.at = performance.now();
    G.scared = m.s; G.lives = m.l; G.level = m.v; G.phase = m.h;
  }
  var ov = null;
  function showOv() {
    if (!ov) { ov = mk('div', 'overlay'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov); }
    ov.hidden = false; ov.textContent = '';
    var p = mk('div', 'panel'); ov.appendChild(p); return p;
  }
  function hideOv() { if (ov) ov.hidden = true; }
  function leaveNet() { if (net) { try { Auth.client.removeChannel(net.ch); } catch (e) {} } net = null; hideOv(); }
  function notice(t) { var p = showOv(); p.appendChild(mk('h2', '', 'ONLINE')); p.appendChild(mk('div', 'line', t)); p.appendChild(btn('OK', 'big-btn', hideOv)); }
  function randCode() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = ''; for (var k = 0; k < 4; k++) c += A[Math.floor(Math.random() * A.length)]; return c; }
  function openOnline() {
    if (HowTo.isOpen()) return;
    if (!navigator.onLine || !Auth.client) { notice('YOU ARE OFFLINE. ONLINE GAMES NEED A CONNECTION.'); return; }
    var p = showOv();
    p.appendChild(mk('h2', '', 'ONLINE MUNCH'));
    p.appendChild(mk('div', 'line', 'UP TO 4 PLAYERS MUNCH THE SAME MAZE TOGETHER AND SHARE THREE LIVES.'));
    p.appendChild(btn('CREATE ROOM', 'big-btn', function () { netJoin(randCode(), true); }));
    var code = mk('input'); code.maxLength = 4; code.placeholder = 'CODE'; code.autocapitalize = 'characters'; code.autocomplete = 'off'; code.spellcheck = false; code.setAttribute('aria-label', 'Room code');
    code.style.cssText = 'width:140px;text-align:center;text-transform:uppercase;font-family:inherit;font-size:18px;letter-spacing:6px;padding:10px 6px 10px 12px;border:2px solid var(--cyan);border-radius:8px;background:var(--tile);color:var(--ink)';
    var row = mk('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:center;width:100%';
    var err = mk('div', 'err'); row.appendChild(code);
    row.appendChild(btn('JOIN', 'big-btn alt', function () {
      var c = code.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (c.length !== 4) { err.textContent = 'ENTER THE 4-LETTER CODE.'; return; }
      netJoin(c, false);
    }));
    p.appendChild(row); p.appendChild(err); p.appendChild(btn('CANCEL', 'linkbtn', hideOv));
  }
  function netJoin(code, host) {
    Auth.session().then(function (sess) {
      if (!sess) return;
      var uid = sess.user.id, nm = Scores.playerName(sess).toUpperCase();
      var ch = Auth.client.channel('munch-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
      net = { ch: ch, code: code, host: host, uid: uid, name: nm, list: [], state: 'lobby', joined: false, hostTimer: null };
      lobbyView();
      ch.on('presence', { event: 'sync' }, function () {
        if (!net || net.ch !== ch) return;
        var st = ch.presenceState(), list = [];
        Object.keys(st).forEach(function (k) { var m = st[k][0]; if (m) list.push({ uid: k, name: m.name, host: !!m.host }); });
        list.sort(function (a, b) { return (b.host - a.host) || (a.name < b.name ? -1 : 1); });
        var prev = net.list.length; net.list = list;
        var hostHere = list.some(function (x) { return x.host; });
        if (net.state === 'lobby') {
          if (list.length > 4) { leaveNet(); notice('THAT ROOM IS FULL.'); return; }
          if (!net.host && !hostHere) { if (net.joined && prev) { leaveNet(); notice('THE HOST LEFT.'); } }
          else lobbyView();
        } else if (role === 'host' && S) {
          S.players.forEach(function (p) { if (!list.some(function (x) { return x.uid === p.uid; })) { p.gone = true; p.alive = false; } });
        } else if (!hostHere && !net.hostTimer) {
          net.hostTimer = setTimeout(function () {
            if (net && !net.list.some(function (x) { return x.host; })) { leaveNet(); showSetup(); notice('THE HOST LEFT. GAME OVER.'); } else if (net) net.hostTimer = null;
          }, 5000);
        }
      });
      ch.on('broadcast', { event: 'start' }, function (m) {
        if (!net || net.ch !== ch || net.host || net.state !== 'lobby') return;
        net.state = 'play'; hideOv(); role = 'guest'; over = false; lastSent = -1;
        var order = m.payload.order;
        me = 0; order.forEach(function (o, i) { if (o.uid === uid) me = i; });
        G = { players: order.map(function (o, i) { return { i: i, uid: o.uid, name: o.name, color: PCOL[i], x: PSP[i][0], y: PSP[i][1], dir: -1, alive: true, inv: 0, score: 0 }; }),
          ghosts: [0, 1, 2, 3].map(function (i) { return { i: i, x: 9, y: 7, dir: -1, mode: 'go' }; }),
          pel: new Uint8Array(basePel), scared: 0, lives: 3, level: 1, phase: 'ready', t: 3, cur: null, prev: null, at: 0 };
        if (window.Auth && Auth.play) Auth.play(GAME + '-online', { now: true });
        showGame(); startLoop();
      });
      ch.on('broadcast', { event: 'snap' }, function (m) { if (net && net.ch === ch && role === 'guest') applySnap(m.payload); });
      ch.on('broadcast', { event: 'in' }, function (m) {
        if (!net || net.ch !== ch || role !== 'host' || !S) return;
        var pl = m.payload, p = S.players.filter(function (x) { return x.uid === pl.uid; })[0];
        if (p && pl.d >= 0 && pl.d < 4) setWant(p, pl.d | 0);
      });
      ch.on('broadcast', { event: 'over' }, function (m) {
        if (!net || net.ch !== ch || role !== 'guest') return;
        var sc = m.payload.scores, mine = sc.filter(function (x) { return x[0] === uid; })[0];
        finish(mine ? mine[2] : 0, 'LEVEL ' + m.payload.level + '  TEAM ' + sc.reduce(function (a, x) { return a + x[2]; }, 0));
      });
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          ch.track({ name: nm, host: host }); net.joined = true;
          if (!host) setTimeout(function () { if (net && net.ch === ch && net.state === 'lobby' && !net.list.some(function (x) { return x.host; })) { leaveNet(); notice('NO ROOM WITH THAT CODE.'); } }, 3500);
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && net && net.ch === ch && net.state === 'lobby') { leaveNet(); notice('COULD NOT CONNECT. TRY AGAIN.'); }
      });
    });
  }
  function lobbyView() {
    if (!net || net.state !== 'lobby') return;
    var p = showOv();
    p.appendChild(mk('h2', '', 'ROOM ' + net.code));
    p.appendChild(mk('div', 'line', net.host ? 'SHARE THIS CODE. START WHEN EVERYONE HAS JOINED (UP TO 4).' : 'WAITING FOR THE HOST TO START...'));
    var list = mk('div', 'table');
    net.list.forEach(function (x, i) {
      var d = mk('div', x.uid === net.uid ? 'me' : '');
      d.appendChild(mk('span', '', x.uid === net.uid ? 'YOU' : x.name)); d.appendChild(mk('span', '', x.host ? 'HOST' : 'READY')); list.appendChild(d);
    });
    p.appendChild(list);
    if (net.host) {
      var many = net.list.length >= 2, go = btn(many ? 'START GAME' : 'WAITING FOR PLAYERS', 'big-btn', startOnline);
      go.disabled = !many; if (!many) go.style.opacity = '.4';
      p.appendChild(go);
    }
    p.appendChild(btn('LEAVE', 'linkbtn', function () { leaveNet(); }));
  }
  function startOnline() {
    if (!net || !net.host || net.list.length < 2) return;
    net.state = 'play'; role = 'host'; over = false; lastSent = -1; acc = 0; snapN = 0;
    var order = net.list.map(function (x) { return { uid: x.uid, name: x.name }; });
    me = 0; order.forEach(function (o, i) { if (o.uid === net.uid) me = i; });
    net.ch.send({ type: 'broadcast', event: 'start', payload: { order: order } });
    hideOv();
    newState(order.map(function (o, i) { return newPlayer(i, o.uid, o.name); }));
    if (window.Auth && Auth.play) Auth.play(GAME + '-online', { now: true });
    showGame(); startLoop();
  }
  $('online').addEventListener('click', openOnline);

  $('help').addEventListener('click', function () {
    HowTo.show({ title: 'HOW TO PLAY MAZE MUNCH', steps: [
      'Steer your chomper with the arrow pad, swipes on the maze, or the arrow keys. You keep moving until you hit a wall.',
      'Eat every dot to clear the level. Big flashing dots turn the ghosts blue for a few seconds. Eat blue ghosts for bonus points (200, 400, 800, 1600).',
      'Touching a ghost costs a life. Everyone shares three lives. The side doors on the middle row loop around to the other side.',
      'Online, one player makes a room and shares the 4-letter code. Up to 4 players munch the same maze together, and each player keeps their own score.',
      'Each ghost hunts a little differently. Do not stay in one spot for long.'
    ] });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && role === 'solo' && S && S.phase === 'play') { S.phase = 'ready'; S.t = 1.5; } });
  Auth.require();
})();
