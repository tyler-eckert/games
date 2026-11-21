/*
  Wahoo. Rules implemented (from the Wikipedia article): 2-6 players, 4 marbles each; roll a 1 or 6 to leave
  the base; a 6 earns another roll; never land on or pass your own marble; landing exactly on another
  player's marble sends it back to its base; exact count into the home row; first to get all four home wins;
  no legal move passes the turn. Cut-throat play only (no partners).
  Board details the article does not give are ASSUMPTIONS: 6 corners, 7 holes per side (42-hole track),
  4 home holes, center shortcut (enter with a 1 from a corner hole, leave with a 1 or 6 to the corner just
  before your home row).
  Two boards: up to 4 players use a square cross board (56-hole track, 14 per side, like a wooden Wahoo board);
  5 or 6 players use a hexagon (42-hole track). Optional double dice: both dice are played, in either order;
  a 1 or a 6 on either die brings a marble out, and any 6 earns another roll.
*/
(function () {
  var GAME = 'wahoo';
  var TRACK = 42, SIDE = 7, HOME0 = 42, HOME3 = 45, LAP = 42, CORNER_MAX = 28, CENTER = 100, BASE = -1, EXIT_POS = 35, mode = 'hex';
  var W = 440, CX = 220, CY = 220, R = 150, U = 29, MR = 8;
  var HEX_COLORS = ['#ff4d5e', '#ffc83d', '#7dff6b', '#3ef0ff', '#4d6bff', '#e86bff'];
  var CROSS_COLORS = ['#ffc83d', '#ff4d5e', '#7dff6b', '#4d9bff'];
  var COLORS = HEX_COLORS;
  var SEAT_SETS = { 1: [0, 2], 2: [0, 1, 3], 3: [0, 1, 2, 3], 4: [0, 1, 2, 3, 4], 5: [0, 1, 2, 3, 4, 5] };

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('c'), cx = cv.getContext('2d');
  var dpr = window.devicePixelRatio || 1, scale = 1;

  /* ---------- geometry ---------- */
  function vert(i) {
    var a = -Math.PI / 2 + i * Math.PI / 3;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), a: a };
  }
  var TRACK_XY = [], HOME_XY = [], BASE_XY = [], CENTER_XY = { x: CX, y: CY };
  function buildCross() {
    var path = [], x, y, k, s, j;
    function P(a, b) { path.push([a, b]); }
    for (x = -2; x <= 2; x++) P(x, -7);
    for (y = -6; y <= -3; y++) P(2, y);
    P(2, -2);
    for (x = 3; x <= 6; x++) P(x, -2);
    for (y = -2; y <= 2; y++) P(7, y);
    for (x = 6; x >= 3; x--) P(x, 2);
    P(2, 2);
    for (y = 3; y <= 6; y++) P(2, y);
    for (x = 2; x >= -2; x--) P(x, 7);
    for (y = 6; y >= 3; y--) P(-2, y);
    P(-2, 2);
    for (x = -3; x >= -6; x--) P(x, 2);
    for (y = 2; y >= -2; y--) P(-7, y);
    for (x = -6; x <= -3; x++) P(x, -2);
    P(-2, -2);
    for (y = -3; y >= -6; y--) P(-2, y);
    TRACK_XY = []; HOME_XY = []; BASE_XY = [];
    for (k = 0; k < 56; k++) { var q = path[(k + 32) % 56]; TRACK_XY.push({ x: CX + q[0] * U, y: CY + q[1] * U }); }
    function rot(pt, times) { var a = pt[0], b = pt[1], t; while (times-- > 0) { t = a; a = -b; b = t; } return { x: CX + a * U, y: CY + b * U }; }
    for (s = 0; s < 4; s++) {
      HOME_XY.push([]); BASE_XY.push([]);
      for (j = 0; j < 4; j++) HOME_XY[s].push(rot([0, 6 - j], s));
      for (j = 0; j < 4; j++) BASE_XY[s].push(rot([-6.3 + 0.8 * j, 6.2 - 0.8 * j], s));
    }
    CENTER_XY = { x: CX, y: CY };
  }
  function setMode(m) {
    mode = m;
    if (m === 'cross') {
      TRACK = 56; SIDE = 14; LAP = 55; HOME0 = 55; HOME3 = 58; CORNER_MAX = 28; EXIT_POS = 42; MR = 10; COLORS = CROSS_COLORS;
      buildCross();
    } else {
      TRACK = 42; SIDE = 7; LAP = 42; HOME0 = 42; HOME3 = 45; CORNER_MAX = 28; EXIT_POS = 35; MR = 8; COLORS = HEX_COLORS;
      buildHex();
    }
  }
  function buildHex() {
    var k, s, j, id;
    TRACK_XY = []; HOME_XY = []; BASE_XY = [];
    for (k = 0; k < TRACK; k++) {
      s = Math.floor(k / SIDE);
      var t = (k % SIDE) / SIDE, a = vert(s), b = vert((s + 1) % 6);
      TRACK_XY.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    for (s = 0; s < 6; s++) {
      var v = vert(s), ux = Math.cos(v.a), uy = Math.sin(v.a), tx = -uy, ty = ux;
      HOME_XY.push([]); BASE_XY.push([]);
      for (j = 0; j < 4; j++) {
        var f = 1 - (j + 1) * 0.19;
        HOME_XY[s].push({ x: CX + (v.x - CX) * f, y: CY + (v.y - CY) * f });
      }
      var bx = CX + ux * (R + 46), by = CY + uy * (R + 46);
      var offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (id = 0; id < 4; id++) {
        BASE_XY[s].push({ x: bx + tx * offs[id][0] * 11 + ux * offs[id][1] * 11, y: by + ty * offs[id][0] * 11 + uy * offs[id][1] * 11 });
      }
    }
  }
  setMode('hex');
  function posXY(seat, pos) {
    if (pos < LAP) return TRACK_XY[(SIDE * seat + pos) % TRACK];
    return HOME_XY[seat][pos - HOME0];
  }
  function marbleXY(m) {
    if (m.pos === BASE) return BASE_XY[m.seat][m.id];
    if (m.pos === CENTER) return CENTER_XY;
    return posXY(m.seat, m.pos);
  }

  /* ---------- state ---------- */
  var dice2 = true, rolls = [], used = [], hadSix = false;
  var players, marbles, turn, roll, moves, phase = 'setup', moved, anims = [], chooseFor = null, opps = 3, gameId = 0;
  var fast = false;
  try { fast = localStorage.getItem('arcade.wahoo.fast') === '1'; } catch (e) {}
  try { var so = +localStorage.getItem('arcade.wahoo.opps'); if (so >= 1 && so <= 5) opps = so; } catch (e) {}
  try { dice2 = localStorage.getItem('arcade.wahoo.dice') !== '1'; } catch (e) {}

  function wait(ms, fn) { var id = gameId; setTimeout(function () { if (id === gameId) fn(); }, fast ? ms * 0.3 : ms); }
  function cur() { return players[turn]; }
  function trackIdx(m) { return (SIDE * m.seat + m.pos) % TRACK; }
  function onTrack(m) { return m.pos >= 0 && m.pos < LAP; }
  function occupantAt(idx, exceptSeat) {
    for (var i = 0; i < marbles.length; i++) {
      var m = marbles[i];
      if (m.seat !== exceptSeat && onTrack(m) && trackIdx(m) === idx) return m;
    }
    return null;
  }
  function centerOccupant(exceptSeat) {
    for (var i = 0; i < marbles.length; i++) if (marbles[i].pos === CENTER && marbles[i].seat !== exceptSeat) return marbles[i];
    return null;
  }
  function own(seat) { return marbles.filter(function (m) { return m.seat === seat; }); }
  function homeCount(seat) { return own(seat).filter(function (m) { return m.pos >= HOME0 && m.pos <= HOME3; }).length; }
  function ownAt(seat, pos, except) {
    for (var i = 0; i < marbles.length; i++) {
      var m = marbles[i];
      if (m.seat === seat && m !== except && m.pos === pos) return true;
    }
    return false;
  }

  /* ---------- rules ---------- */
  function legalMoves(seat, r) {
    var out = [], mine = own(seat), i;
    mine.forEach(function (m) {
      var p = m.pos, t, q, blocked;
      if (p === BASE) return;
      if (p === CENTER) {
        if ((r === 1 || r === 6) && !ownAt(seat, EXIT_POS, m)) {
          out.push({ m: m, type: 'exit', from: p, to: EXIT_POS, cap: occupantAt((SIDE * seat + EXIT_POS) % TRACK, seat), pts: [CENTER_XY, posXY(seat, EXIT_POS)] });
        }
        return;
      }
      t = p + r;
      if (t <= HOME3) {
        blocked = false;
        for (q = p + 1; q <= t; q++) if (ownAt(seat, q, m)) { blocked = true; break; }
        if (!blocked) {
          var pts = [];
          for (q = p; q <= t; q++) pts.push(posXY(seat, q));
          out.push({ m: m, type: 'move', from: p, to: t, cap: t < LAP ? occupantAt((SIDE * seat + t) % TRACK, seat) : null, pts: pts });
        }
      }
      if (r === 1 && p >= SIDE && p <= CORNER_MAX && p % SIDE === 0 && p < LAP) {
        var co = centerOccupant(seat);
        if (!marbles.some(function (z) { return z.seat === seat && z.pos === CENTER; })) {
          out.push({ m: m, type: 'center', from: p, to: CENTER, cap: co, pts: [posXY(seat, p), CENTER_XY] });
        }
      }
    });
    if (r === 1 || r === 6) {
      var inBase = mine.filter(function (m) { return m.pos === BASE; });
      if (inBase.length && !ownAt(seat, 0)) {
        var e = inBase[0];
        out.push({ m: e, type: 'enter', from: BASE, to: 0, cap: occupantAt(SIDE * seat % TRACK, seat), pts: [BASE_XY[seat][e.id], posXY(seat, 0)] });
      }
    }
    return out;
  }

  /* ---------- computer choice ---------- */
  function threats(idx, seat) {
    var n = 0;
    marbles.forEach(function (o) {
      if (o.seat === seat || !onTrack(o)) return;
      var d = (idx - trackIdx(o) + TRACK) % TRACK;
      if (d >= 1 && d <= 6) n++;
    });
    return n;
  }
  function scoreMove(mv, seat) {
    var s = Math.random() * 6;
    if (mv.cap) s += 85 + (mv.cap.pos >= 0 && mv.cap.pos < LAP ? mv.cap.pos * 1.2 : 20);
    if (mv.to >= HOME0 && mv.to <= HOME3) {
      s += 110 + (mv.to - HOME0) * 12;
      if (mv.from < HOME0) s += 30;
    } else if (mv.type === 'enter') s += 50;
    else if (mv.type === 'center') s += 75;
    else if (mv.type === 'exit') s += 65;
    else s += (mv.to - mv.from) * 1.5 + mv.to * 0.4;
    if (mv.to >= 0 && mv.to < LAP) {
      s -= 22 * threats((SIDE * seat + mv.to) % TRACK, seat);
    }
    if (mv.from >= 0 && mv.from < LAP && mv.type !== 'enter') {
      s += 20 * threats((SIDE * seat + mv.from) % TRACK, seat);
    }
    return s;
  }
  function cpuPick(list, seat) {
    var best = null, bs = -1e9;
    list.forEach(function (mv) { var s = scoreMove(mv, seat); if (s > bs) { bs = s; best = mv; } });
    return best;
  }

  /* ---------- turn flow ---------- */
  function setMsg(t) { $('msg').textContent = t; }
  function name(p) { return p.human ? 'YOU' : p.name; }

  function startGame(n) {
    gameId++;
    opps = n;
    try { localStorage.setItem('arcade.wahoo.opps', String(n)); } catch (e) {}
    setMode(n <= 3 ? 'cross' : 'hex');
    var seats = SEAT_SETS[n];
    players = seats.map(function (s, i) { return { seat: s, human: i === 0, name: i === 0 ? 'YOU' : 'CPU ' + i, color: COLORS[s] }; });
    marbles = [];
    players.forEach(function (p) { for (var id = 0; id < 4; id++) marbles.push({ seat: p.seat, id: id, pos: BASE }); });
    turn = 0; roll = 0; moves = []; anims = []; chooseFor = null;
    $('setup').hidden = true; $('game').hidden = false;
    sizeCanvas();
    $('die').textContent = '-'; $('die2').textContent = '-'; $('die2').hidden = !dice2;
    rolls = []; used = [];
    paintDice();
    beginTurn();
  }
  function showSetup() {
    gameId++;
    phase = 'setup';
    $('game').hidden = true; $('setup').hidden = false;
    Array.prototype.forEach.call($('opps').children, function (b) { b.classList.toggle('on', +b.dataset.n === opps); });
  }
  function legend() {
    var l = $('legend');
    l.textContent = '';
    players.forEach(function (p, i) {
      var c = document.createElement('div');
      c.className = 'chip' + (i === turn && phase !== 'over' ? ' cur' : '');
      c.style.setProperty('--c', p.color);
      c.innerHTML = '<i></i><span></span>';
      c.lastChild.textContent = name(p) + ' ' + homeCount(p.seat) + '/4';
      l.appendChild(c);
    });
  }
  function beginTurn() {
    phase = 'await'; moves = []; chooseFor = null; moved = false;
    legend();
    var p = cur();
    if (p.human) {
      setMsg('YOUR TURN. ROLL THE DIE!');
      $('roll').disabled = false;
    } else {
      $('roll').disabled = true;
      setMsg(p.name + ' IS ROLLING...');
      wait(700, doRoll);
    }
  }
  function paintDice() {
    var d = [$('die'), $('die2')];
    d.forEach(function (el, i) {
      el.classList.toggle('used', !!used[i]);
      if (rolls[i] !== undefined) el.textContent = rolls[i];
    });
  }
  function doRoll() {
    if (phase !== 'await') return;
    phase = 'rolling';
    $('roll').disabled = true;
    var ticks = fast ? 4 : 8, n = 0, id = gameId, count = dice2 ? 2 : 1;
    var iv = setInterval(function () {
      if (id !== gameId) { clearInterval(iv); return; }
      used = [];
      for (var i = 0; i < count; i++) { rolls[i] = 1 + Math.floor(Math.random() * 6); }
      rolls.length = count;
      paintDice();
      if (++n >= ticks) { clearInterval(iv); afterRoll(); }
    }, 60);
  }
  function afterRoll() {
    var p = cur();
    hadSix = rolls.indexOf(6) > -1;
    setMsg(name(p) + ' ROLLED ' + rolls.join(' AND ') + '.');
    wait(500, nextDie);
  }
  function collectMoves(p) {
    var list = [], seen = {};
    rolls.forEach(function (r, i) {
      if (used[i]) return;
      legalMoves(p.seat, r).forEach(function (mv) {
        var key = mv.m.seat + '-' + mv.m.id + '-' + mv.type + '-' + mv.to;
        if (seen[key]) return;
        seen[key] = 1; mv.die = i; list.push(mv);
      });
    });
    return list;
  }
  function endTurn() {
    var p = cur();
    if (hadSix) {
      setMsg(name(p) + ' ROLLED A 6. ROLL AGAIN!');
      wait(700, beginTurn);
    } else wait(400, nextPlayer);
  }
  function nextDie() {
    var p = cur();
    if (phase === 'over') return;
    moves = collectMoves(p);
    if (!moves.length) {
      var any = rolls.some(function (r, i) { return !used[i]; });
      var anyUsed = used.some(function (u) { return u; });
      if (any) setMsg(name(p) + (anyUsed ? ' HAS NO MORE MOVES.' : ' HAS NO MOVE.'));
      wait(900, endTurn);
      return;
    }
    if (p.human) {
      if (moves.length === 1) {
        phase = 'anim';
        wait(400, function () { execute(moves[0]); });
      } else {
        phase = 'pick';
        setMsg('TAP A GLOWING MARBLE.');
      }
    } else {
      phase = 'anim';
      var mv = cpuPick(moves, p.seat);
      wait(650, function () { execute(mv); });
    }
  }
  function allSameMarble(list) { return list.every(function (x) { return x.m === list[0].m; }); }

  function execute(mv) {
    phase = 'anim'; chooseFor = null;
    var m = mv.m, p = cur();
    used[mv.die] = true; roll = rolls[mv.die]; paintDice();
    var seg = fast ? 45 : 110;
    var pts = mv.pts;
    anims.push({ m: m, pts: pts, start: performance.now(), seg: seg, done: function () {
      m.pos = mv.to;
      if (mv.cap) {
        mv.cap.pos = BASE;
        setMsg(name(p) + ' SENT ' + name(players.filter(function (q) { return q.seat === mv.cap.seat; })[0]) + ' BACK HOME!');
      }
      moved = true;
      legend();
      if (homeCount(p.seat) === 4) { finish(p); return; }
      wait(mv.cap ? 900 : 350, function () {
        if (rolls.every(function (r, i) { return used[i]; })) endTurn();
        else nextDie();
      });
    } });
  }
  function nextPlayer() {
    turn = (turn + 1) % players.length;
    beginTurn();
  }
  function finish(p) {
    phase = 'over';
    var humanWon = p.human, hc = homeCount(players[0].seat);
    var score = hc * 100 + (humanWon ? 500 * opps : 0);
    setMsg(humanWon ? 'YOU WIN!' : p.name + ' WINS.');
    Endgame.show({
      key: GAME, title: humanWon ? 'WAHOO! YOU WIN!' : 'GAME OVER',
      color: humanWon ? '#7dff6b' : '#ff7b8a',
      line: humanWon ? 'BEAT ' + opps + ' COMPUTER ' + (opps === 1 ? 'PLAYER' : 'PLAYERS') : p.name + ' GOT HOME FIRST (' + hc + '/4 YOURS)',
      score: score, delay: 700, onAgain: showSetup
    });
  }

  /* ---------- input ---------- */
  function toLogical(e) {
    var rect = cv.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (W / rect.height) };
  }
  function targets() {
    var out = [];
    if (phase === 'pick') {
      var seen = [];
      moves.forEach(function (mv) {
        var key = mv.type === 'enter' ? 'base' : mv.m.id;
        var t = seen.filter(function (s) { return s.key === key; })[0];
        if (!t) { t = { key: key, list: [], xy: marbleXY(mv.m) }; seen.push(t); out.push(t); }
        t.list.push(mv);
      });
      // allow any base marble to start the "enter" move
    } else if (phase === 'choose' && chooseFor) {
      chooseFor.forEach(function (mv) {
        out.push({ list: [mv], xy: mv.to === CENTER ? CENTER_XY : mv.to >= HOME0 ? posXY(cur().seat, mv.to) : posXY(cur().seat, mv.to) });
      });
    }
    return out;
  }
  cv.addEventListener('pointerdown', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen()) return;
    if (phase !== 'pick' && phase !== 'choose') return;
    var pt = toLogical(e), best = null, bd = 22;
    targets().forEach(function (t) {
      var d = Math.hypot(t.xy.x - pt.x, t.xy.y - pt.y);
      if (d < bd) { bd = d; best = t; }
    });
    // tapping any base marble selects the enter move
    if (!best && phase === 'pick') {
      var enter = moves.filter(function (mv) { return mv.type === 'enter'; })[0];
      if (enter) own(cur().seat).forEach(function (m) {
        if (m.pos === BASE && Math.hypot(BASE_XY[m.seat][m.id].x - pt.x, BASE_XY[m.seat][m.id].y - pt.y) < 20) best = { list: [enter] };
      });
    }
    if (!best) return;
    if (best.list.length === 1) { execute(best.list[0]); return; }
    phase = 'choose'; chooseFor = best.list;
    setMsg('TAP WHERE TO GO.');
  });
  $('roll').addEventListener('click', function () {
    if (phase === 'await' && cur().human) doRoll();
  });
  document.addEventListener('keydown', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen() || e.target.tagName === 'INPUT') return;
    if ((e.key === ' ' || e.key === 'Enter') && phase === 'await' && cur() && cur().human && document.activeElement.tagName !== 'BUTTON') {
      e.preventDefault(); doRoll();
    }
  });

  /* ---------- drawing ---------- */
  function ring(x, y, r, color, w) {
    cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.lineWidth = w || 2; cx.strokeStyle = color; cx.stroke();
  }
  function hole(x, y, r, fill, stroke) {
    cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2);
    cx.fillStyle = fill; cx.fill();
    if (stroke) { cx.lineWidth = 1.5; cx.strokeStyle = stroke; cx.stroke(); }
  }
  function drawBoard() {
    var s, j, k;
    if (mode === 'cross') { drawCross(); return; }
    // hexagon
    cx.beginPath();
    for (s = 0; s < 6; s++) { var v = vert(s); if (s) cx.lineTo(v.x, v.y); else cx.moveTo(v.x, v.y); }
    cx.closePath();
    cx.fillStyle = '#14123a'; cx.fill();
    cx.lineWidth = 3; cx.strokeStyle = '#2a2870'; cx.stroke();
    // home rows and base areas
    for (s = 0; s < 6; s++) {
      var col = COLORS[s], active = players && players.some(function (p) { return p.seat === s; });
      cx.globalAlpha = active ? 1 : 0.35;
      cx.beginPath(); cx.moveTo(vert(s).x, vert(s).y); cx.lineTo(HOME_XY[s][3].x, HOME_XY[s][3].y);
      cx.lineWidth = 12; cx.strokeStyle = 'rgba(122,121,187,.12)'; cx.lineCap = 'round'; cx.stroke();
      for (j = 0; j < 4; j++) hole(HOME_XY[s][j].x, HOME_XY[s][j].y, 7, '#07061a', col);
      for (j = 0; j < 4; j++) hole(BASE_XY[s][j].x, BASE_XY[s][j].y, 7, '#07061a', col);
      cx.globalAlpha = 1;
    }
    for (k = 0; k < TRACK; k++) {
      var corner = k % SIDE === 0;
      var seat = k / SIDE;
      hole(TRACK_XY[k].x, TRACK_XY[k].y, corner ? 8 : 6, '#07061a', corner ? COLORS[seat] : '#7a79bb');
    }
    hole(CX, CY, 9, '#07061a', '#ffc83d');
    ring(CX, CY, 13, 'rgba(255,200,61,.35)', 2);
  }
  function drawCross() {
    var s, j, k;
    cx.beginPath();
    var r = 16, x0 = 6, y0 = 6, w = W - 12;
    cx.moveTo(x0 + r, y0); cx.arcTo(x0 + w, y0, x0 + w, y0 + w, r); cx.arcTo(x0 + w, y0 + w, x0, y0 + w, r);
    cx.arcTo(x0, y0 + w, x0, y0, r); cx.arcTo(x0, y0, x0 + w, y0, r); cx.closePath();
    cx.fillStyle = '#14123a'; cx.fill();
    cx.lineWidth = 3; cx.strokeStyle = '#2a2870'; cx.stroke();
    for (s = 0; s < 4; s++) {
      var col = COLORS[s], active = players && players.some(function (p) { return p.seat === s; });
      cx.globalAlpha = active ? 1 : 0.3;
      for (j = 0; j < 4; j++) hole(HOME_XY[s][j].x, HOME_XY[s][j].y, 9, '#07061a', col);
      for (j = 0; j < 4; j++) hole(BASE_XY[s][j].x, BASE_XY[s][j].y, 9, '#07061a', col);
      cx.globalAlpha = 1;
    }
    for (k = 0; k < TRACK; k++) {
      var corner = k % SIDE === 0;
      hole(TRACK_XY[k].x, TRACK_XY[k].y, corner ? 10 : 8, '#07061a', corner ? COLORS[k / SIDE] : '#7a79bb');
    }
    hole(CX, CY, 11, '#07061a', '#ffc83d');
    ring(CX, CY, 15, 'rgba(255,200,61,.35)', 2);
  }
  function drawMarble(m, xy) {
    var c = COLORS[m.seat];
    cx.beginPath(); cx.arc(xy.x, xy.y, MR, 0, Math.PI * 2);
    var g = cx.createRadialGradient(xy.x - 3, xy.y - 3, 1, xy.x, xy.y, MR + 1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, '#00000088');
    cx.fillStyle = c; cx.fill();
    cx.fillStyle = g; cx.fill();
    cx.lineWidth = 1.5; cx.strokeStyle = '#0b0a1f'; cx.stroke();
  }
  function frame(t) {
    try { draw(t); } catch (e) { if (window.console) console.error(e); }
    requestAnimationFrame(frame);
  }
  function draw(t) {
    cx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    cx.clearRect(0, 0, W, W);
    drawBoard();
    if (marbles) {
      var animating = {};
      anims = anims.filter(function (a) {
        var el = Math.max(0, (t - a.start) / a.seg), n = a.pts.length - 1;
        if (el >= n) { a.done(); return false; }
        var i = Math.floor(el), f = el - i;
        a.xy = { x: a.pts[i].x + (a.pts[i + 1].x - a.pts[i].x) * f, y: a.pts[i].y + (a.pts[i + 1].y - a.pts[i].y) * f };
        animating[a.m.seat + '-' + a.m.id] = a;
        return true;
      });
      var drawn = [];
      marbles.forEach(function (m) {
        var a = animating[m.seat + '-' + m.id];
        if (!a) drawMarble(m, marbleXY(m)); else drawn.push(a);
      });
      drawn.forEach(function (a) { drawMarble(a.m, a.xy); });
      // highlights
      var pulse = 0.5 + 0.5 * Math.sin(t / 160);
      if (phase === 'pick') {
        targets().forEach(function (tg) { ring(tg.xy.x, tg.xy.y, 11 + pulse * 3, '#ffffff', 3); });
        if (moves.some(function (mv) { return mv.type === 'enter'; })) {
          own(cur().seat).forEach(function (m) { if (m.pos === BASE) ring(BASE_XY[m.seat][m.id].x, BASE_XY[m.seat][m.id].y, 11 + pulse * 3, '#ffffff', 3); });
        }
      } else if (phase === 'choose') {
        targets().forEach(function (tg) { ring(tg.xy.x, tg.xy.y, 12 + pulse * 3, '#ffc83d', 3); });
      }
    }
  }
  function sizeCanvas() {
    var avail = Math.min(cv.parentElement.clientWidth - 16 || 340, 420);
    scale = Math.max(0.5, avail / W);
    var px = Math.floor(W * scale);
    cv.style.width = px + 'px'; cv.style.height = px + 'px';
    cv.width = Math.round(px * dpr); cv.height = Math.round(px * dpr);
    scale = px / W;
  }
  window.addEventListener('resize', function () { if (!$('game').hidden) sizeCanvas(); });

  /* ---------- controls ---------- */
  $('opps').addEventListener('click', function (e) {
    var b = e.target.closest('.lv');
    if (!b) return;
    opps = +b.dataset.n;
    Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
  });
  function paintDiceSel() {
    Array.prototype.forEach.call($('dicesel').children, function (b) { b.classList.toggle('on', (+b.dataset.n === 2) === dice2); });
  }
  $('dicesel').addEventListener('click', function (e) {
    var b = e.target.closest('.lv');
    if (!b) return;
    dice2 = +b.dataset.n === 2;
    try { localStorage.setItem('arcade.wahoo.dice', dice2 ? '2' : '1'); } catch (er) {}
    paintDiceSel();
  });
  paintDiceSel();
  $('start').addEventListener('click', function () { startGame(opps); });
  function paintSpeed() {
    $('speed').textContent = 'SPEED: ' + (fast ? 'FAST' : 'NORMAL');
    $('speed').setAttribute('aria-pressed', fast ? 'true' : 'false');
  }
  $('speed').addEventListener('click', function () {
    fast = !fast;
    try { localStorage.setItem('arcade.wahoo.fast', fast ? '1' : '0'); } catch (e) {}
    paintSpeed();
  });
  paintSpeed();

  var HELP = [
    'Race your 4 marbles clockwise around the board and into your home row. You play against 1 to 5 computer players.',
    'Roll a 1 or a 6 to bring a marble out of its base onto your start hole. A 6 also earns another roll. With double dice you play both dice, in whichever order you like.',
    'Move the number you rolled. You can never land on or pass your own marbles. Land exactly on another color to send that marble back to its base.',
    'You need an exact count to settle into your home row. From one of the other corner holes, a roll of 1 can take you to the center shortcut. A 1 or 6 lets you leave it, close to home.',
    'The first player to get all 4 marbles home wins. When more than one marble can move, tap a glowing marble to move it.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  Auth.require().then(function (s) {
    if (!s) return;
    showSetup();
    requestAnimationFrame(frame);
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
