/*
  Wahoo. 2-6 players, 4 marbles each, clockwise. House rules in this version:
  - A 1 or a 6 brings a marble out of its base. Never land on or pass your own marble; landing exactly on
    another color sends that marble back to its base; exact count into the home row; first home wins.
  - Dice: one or two. After playing the dice, every die that showed a 1 or a 6 is rolled again (only those dice).
    Doubles roll both dice again. This repeats as long as it keeps happening, but only dice that were actually played earn a bonus roll:
    if you have no legal move, the turn passes with no reroll.
  - Center shortcut: each player has a port 6 holes past their start hole. Landing on the port with a 1 or a 6 drops the marble into the center; landing there any other way does nothing. It leaves the center only on a 1 and lands 8 holes behind your start hole (the last stretch before your home row).
  - Boards: up to 4 players use a square cross board (56-hole track); 5 or 6 players use a hexagon (42-hole track).
  - Online: players take turns on their own devices. Each device runs the same rules; the player whose turn it is
    sends their dice and move, and the host plays the computer seats. Empty seats become computers.
*/
(function () {
  var GAME = 'wahoo';
  var TRACK = 42, SIDE = 7, HOME0 = 42, HOME3 = 45, LAP = 42, PORT = 6, CENTER = 100, BASE = -1, EXIT_POS = 34, mode = 'hex';
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
      TRACK = 56; SIDE = 14; LAP = 55; HOME0 = 55; HOME3 = 58; EXIT_POS = 48; MR = 10; COLORS = CROSS_COLORS;
      buildCross();
    } else {
      TRACK = 42; SIDE = 7; LAP = 42; HOME0 = 42; HOME3 = 45; EXIT_POS = 34; MR = 8; COLORS = HEX_COLORS;
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
  var dice2 = true, rolls = [], used = [], pendingCount = 1, note = '', net = null, viewAngle = 0;
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
        if (r === 1 && !ownAt(seat, EXIT_POS, m)) {
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
          if (t === PORT && (r === 1 || r === 6) && !ownAt(seat, CENTER)) {   // landing on your port with a 1 or 6 drops you into the center
            pts.push(CENTER_XY);
            out.push({ m: m, type: 'center', from: p, to: CENTER, cap: centerOccupant(seat), pts: pts });
          } else out.push({ m: m, type: 'move', from: p, to: t, cap: t < LAP ? occupantAt((SIDE * seat + t) % TRACK, seat) : null, pts: pts });
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
  function name(p) { return p.kind === 'me' ? 'YOU' : p.name; }
  function me() { for (var i = 0; i < players.length; i++) if (players[i].kind === 'me') return players[i]; return players[0]; }
  function isDriver(p) { return p.kind === 'cpu' && (!net || net.host); }   // this device plays this computer's turn

  // list: [{ kind: 'me' | 'remote' | 'cpu', name, uid }] in turn order
  function setupPlayers(list) {
    var total = list.length;
    setMode(total <= 4 ? 'cross' : 'hex');
    var seats = SEAT_SETS[total - 1];
    players = list.map(function (q, i) { return { seat: seats[i], kind: q.kind, name: q.name, uid: q.uid, color: COLORS[seats[i]] }; });
    marbles = [];
    players.forEach(function (p) { for (var id = 0; id < 4; id++) marbles.push({ seat: p.seat, id: id, pos: BASE }); });
    viewAngle = -(mode === 'cross' ? Math.PI / 2 : Math.PI / 3) * me().seat;   // your color at the bottom
    turn = 0; roll = 0; moves = []; anims = []; chooseFor = null; rolls = []; used = [];
    $('setup').hidden = true; $('game').hidden = false;
    sizeCanvas();
    beginTurn();
  }
  function startGame(n) {
    if (window.Auth && Auth.play) Auth.play('wahoo', { now: true });
    gameId++;
    leaveNet();
    opps = n;
    try { localStorage.setItem('arcade.wahoo.opps', String(n)); } catch (e) {}
    var list = [{ kind: 'me', name: 'YOU' }];
    for (var i = 1; i <= n; i++) list.push({ kind: 'cpu', name: 'CPU ' + i });
    setupPlayers(list);
  }
  function showSetup() {
    gameId++;
    leaveNet();
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
  function paintDice() {
    var els = [$('die'), $('die2')];
    var show2 = rolls.length ? rolls.length === 2 : pendingCount === 2;
    $('die2').hidden = !show2;
    els.forEach(function (el, i) {
      el.classList.toggle('used', !!used[i]);
      el.textContent = rolls[i] !== undefined ? rolls[i] : '-';
    });
  }

  /* a turn = rounds of dice. Round 1 rolls all dice; later rounds roll only the dice that earned it. */
  function beginTurn() {
    pendingCount = dice2 ? 2 : 1; rolls = []; used = []; note = '';
    paintDice();
    promptRoll();
  }
  function promptRoll() {
    phase = 'await'; moves = []; chooseFor = null;
    paintDice(); legend();
    var p = cur();
    $('roll').disabled = true;
    if (p.kind === 'me') { setMsg(note || (pendingCount === 2 ? 'YOUR TURN. ROLL THE DICE!' : 'YOUR TURN. ROLL THE DIE!')); $('roll').disabled = false; }
    else if (isDriver(p)) { setMsg(name(p) + ' IS ROLLING...'); wait(700, doRoll); }
    else { setMsg(name(p) + ' IS ROLLING...'); pump(); }
  }
  function doRoll() {
    if (phase !== 'await') return;
    var vals = [];
    for (var i = 0; i < pendingCount; i++) vals.push(1 + Math.floor(Math.random() * 6));
    sendEv({ t: 'roll', v: vals });
    applyRoll(vals);
  }
  function applyRoll(vals) {
    phase = 'rolling';
    $('roll').disabled = true;
    var ticks = fast ? 4 : 8, n = 0, id = gameId, k = vals.length;
    var iv = setInterval(function () {
      if (id !== gameId) { clearInterval(iv); return; }
      if (++n >= ticks) { clearInterval(iv); rolls = vals.slice(); used = []; paintDice(); afterRoll(); return; }
      rolls = []; used = [];
      for (var i = 0; i < k; i++) rolls.push(1 + Math.floor(Math.random() * 6));
      paintDice();
    }, 60);
  }
  function afterRoll() {
    var p = cur();
    setMsg(name(p) + ' ROLLED ' + rolls.join(' AND ') + '.');
    wait(500, nextDie);
  }
  function collectMoves(p) {
    var list = [], seen = {};
    var order = rolls.map(function (r, i) { return i; }).sort(function (x, y) { return rolls[x] - rolls[y]; });
    order.forEach(function (i) {   // lowest die first, so a 1 (not the more useful 6) is the one spent bringing a marble out
      var r = rolls[i];
      if (used[i]) return;
      legalMoves(p.seat, r).forEach(function (mv) {
        var key = mv.m.seat + '-' + mv.m.id + '-' + mv.type + '-' + mv.to;
        if (seen[key]) return;
        seen[key] = 1; mv.die = i; list.push(mv);
      });
    });
    return list;
  }
  function againCount() {   // a bonus roll is only earned by dice that were actually played
    var any = used.some(function (u) { return u; });
    if (!any) return 0;
    if (rolls.length === 2 && rolls[0] === rolls[1]) return 2;
    var k = 0; rolls.forEach(function (r, i) { if (used[i] && (r === 1 || r === 6)) k++; });
    return k;
  }
  function endTurn() {
    var p = cur(), k = againCount();
    if (!k) { wait(400, nextPlayer); return; }
    var doubles = rolls.length === 2 && rolls[0] === rolls[1];
    var why = doubles ? 'DOUBLES! BOTH DICE ROLL AGAIN.' : (k === 2 ? 'A 1 AND A 6! BOTH DICE ROLL AGAIN.' : 'THAT ' + rolls.filter(function (r, i) { return used[i] && (r === 1 || r === 6); })[0] + ' EARNS ANOTHER ROLL OF ONE DIE.');
    setMsg(name(p) + ': ' + why);
    wait(1100, function () {
      pendingCount = k; rolls = []; used = [];
      note = p.kind === 'me' ? why : '';
      promptRoll();
    });
  }
  function nextDie() {
    var p = cur();
    if (phase === 'over') return;
    moves = collectMoves(p);
    if (!moves.length) {
      var anyUsed = used.some(function (u) { return u; });
      setMsg(name(p) + (anyUsed ? ' HAS NO MORE MOVES.' : ' HAS NO MOVE.'));
      phase = 'anim';
      wait(900, endTurn);
      return;
    }
    if (p.kind === 'me') {
      if (moves.length === 1) {
        phase = 'anim';
        var only = moves[0];
        wait(400, function () { playMove(only); });
      } else {
        phase = 'pick';
        setMsg('TAP A GLOWING MARBLE.');
      }
    } else if (isDriver(p)) {
      phase = 'anim';
      var mv = cpuPick(moves, p.seat);
      wait(650, function () { playMove(mv); });
    } else {
      phase = 'wait';
      setMsg(name(p) + ' IS PLAYING...');
      pump();
    }
  }
  function playMove(mv) {   // a move decided on this device: tell everyone, then do it
    sendEv({ t: 'move', mid: mv.m.id, type: mv.type, to: mv.to });
    execute(mv);
  }
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
    var mp = me(), won = p === mp, hc = homeCount(mp.seat), others = players.length - 1;
    var score = hc * 100 + (won ? 500 * others : 0);
    setMsg(won ? 'YOU WIN!' : p.name + ' WINS.');
    Endgame.show({
      key: GAME, title: won ? 'WAHOO! YOU WIN!' : 'GAME OVER',
      color: won ? '#7dff6b' : '#ff7b8a',
      line: won ? 'BEAT ' + others + (others === 1 ? ' PLAYER' : ' PLAYERS') : p.name + ' GOT HOME FIRST (' + hc + '/4 YOURS)',
      score: score, delay: 700, onAgain: showSetup
    });
  }

  /* ---------- online play (Supabase Realtime: presence + broadcast) ---------- */
  function sendEv(e) {
    if (!net) return;
    e.i = net.ev++;
    net.ch.send({ type: 'broadcast', event: 'ev', payload: e });
  }
  function pump() {   // apply other players' rolls and moves, in order, when this device is ready for them
    var e;
    while (net && players && (e = net.queue[net.ev])) {
      var p = cur();
      if (e.t === 'roll' && phase === 'await' && p.kind !== 'me' && !isDriver(p)) {
        delete net.queue[net.ev]; net.ev++;
        applyRoll(e.v);
      } else if (e.t === 'move' && phase === 'wait') {
        var mv = collectMoves(p).filter(function (x) { return x.m.id === e.mid && x.type === e.type && x.to === e.to; })[0];
        delete net.queue[net.ev]; net.ev++;
        if (mv) execute(mv); else setMsg('OUT OF SYNC. LEAVE AND REJOIN.');
        break;
      } else break;
    }
  }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = mk('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  var ov = null;
  function showOv() {
    if (!ov) { ov = mk('div', 'overlay'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov); }
    ov.hidden = false; ov.textContent = '';
    var panel = mk('div', 'panel'); ov.appendChild(panel);
    return panel;
  }
  function hideOv() { if (ov) ov.hidden = true; }
  function leaveNet() {
    if (net) { try { Auth.client.removeChannel(net.ch); } catch (e) {} }
    net = null; hideOv();
  }
  function notice(text) {
    var panel = showOv();
    panel.appendChild(mk('h2', '', 'ONLINE'));
    panel.appendChild(mk('div', 'line', text));
    panel.appendChild(btn('OK', 'big-btn', function () { hideOv(); }));
  }
  function randCode() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = ''; for (var i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }

  function openOnline() {
    if (HowTo.isOpen()) return;
    if (!navigator.onLine || !Auth.client) { notice('YOU ARE OFFLINE. ONLINE GAMES NEED A CONNECTION.'); return; }
    var total = 4;
    var panel = showOv();
    panel.appendChild(mk('h2', '', 'ONLINE WAHOO'));
    panel.appendChild(mk('div', 'line', 'PLAY WITH FRIENDS ON THEIR OWN DEVICES. EMPTY SEATS BECOME COMPUTERS.'));
    panel.appendChild(mk('div', 'line', 'PLAYERS AT THE TABLE'));
    var seg = mk('div', 'seg'); seg.style.width = '100%';
    [2, 3, 4, 5, 6].forEach(function (n) {
      var b = btn(String(n), 'lv' + (n === total ? ' on' : ''), function () {
        total = n; Array.prototype.forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); });
      });
      seg.appendChild(b);
    });
    panel.appendChild(seg);
    panel.appendChild(btn('CREATE ROOM', 'big-btn', function () { netJoin(randCode(), true, total); }));
    var code = mk('input'); code.maxLength = 4; code.placeholder = 'CODE'; code.autocapitalize = 'characters'; code.autocomplete = 'off'; code.spellcheck = false;
    code.setAttribute('aria-label', 'Room code');
    code.style.cssText = 'width:140px;text-align:center;text-transform:uppercase;font-family:inherit;font-size:18px;letter-spacing:6px;padding:10px 6px 10px 12px;border:2px solid var(--cyan);border-radius:8px;background:var(--tile);color:var(--ink)';
    var row = mk('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:center;width:100%';
    var msg = mk('div', 'err');
    row.appendChild(code);
    row.appendChild(btn('JOIN', 'big-btn alt', function () {
      var c = code.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (c.length !== 4) { msg.textContent = 'ENTER THE 4-LETTER CODE.'; return; }
      netJoin(c, false, total);
    }));
    panel.appendChild(row); panel.appendChild(msg);
    panel.appendChild(btn('CANCEL', 'linkbtn', hideOv));
  }
  function netJoin(code, host, total) {
    Auth.session().then(function (sess) {
      if (!sess) return;
      var uid = sess.user.id, nm = Scores.playerName(sess).toUpperCase();
      var ch = Auth.client.channel('wahoo-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
      net = { ch: ch, code: code, host: host, uid: uid, name: nm, total: total, list: [], ev: 0, queue: {}, state: 'lobby', joined: false, gone: {} };
      lobbyView();
      ch.on('presence', { event: 'sync' }, function () {
        if (!net || net.ch !== ch) return;
        var st = ch.presenceState(), list = [];
        Object.keys(st).forEach(function (k) { var m = st[k][0]; if (m) list.push({ uid: k, name: m.name, host: !!m.host }); });
        list.sort(function (a, b) { return (b.host - a.host) || (a.name < b.name ? -1 : 1); });
        var prev = net.list.length;
        net.list = list;
        var hostHere = list.some(function (x) { return x.host; });
        if (net.state === 'lobby') {
          if (list.length > 6) { leaveNet(); notice('THAT ROOM IS FULL.'); return; }
          if (!net.host && !hostHere) { if (net.joined && prev) { leaveNet(); notice('THE HOST LEFT.'); } }
          else lobbyView();
        } else if (net.state === 'play') watchSeats();
      });
      ch.on('broadcast', { event: 'start' }, function (m) { if (net && net.ch === ch && net.state === 'lobby') startNet(m.payload); });
      ch.on('broadcast', { event: 'ev' }, function (m) { if (net && net.ch === ch) { net.queue[m.payload.i] = m.payload; pump(); } });
      ch.on('broadcast', { event: 'takeover' }, function (m) { if (net && net.ch === ch) applyTakeover(m.payload.uid); });
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          ch.track({ name: nm, host: host });
          net.joined = true;
          if (!host) setTimeout(function () {
            if (net && net.ch === ch && net.state === 'lobby' && !net.list.some(function (x) { return x.host; })) { leaveNet(); notice('NO ROOM WITH THAT CODE.'); }
          }, 3500);
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && net && net.ch === ch && net.state === 'lobby') {
          leaveNet(); notice('COULD NOT CONNECT. TRY AGAIN.');
        }
      });
    });
  }
  function lobbyView() {
    if (!net || net.state !== 'lobby') return;
    var panel = showOv();
    panel.appendChild(mk('h2', '', 'ROOM ' + net.code));
    var seats = Math.max(net.total, net.list.length);
    panel.appendChild(mk('div', 'line', net.host ? 'SHARE THIS CODE. START WHEN EVERYONE HAS JOINED.' : 'WAITING FOR THE HOST TO START...'));
    var list = mk('div', 'table');
    net.list.forEach(function (p) {
      var d = mk('div', p.uid === net.uid ? 'me' : '');
      d.appendChild(mk('span', '', p.uid === net.uid ? 'YOU' : p.name));
      d.appendChild(mk('span', '', p.host ? 'HOST' : 'READY'));
      list.appendChild(d);
    });
    for (var i = net.list.length; i < seats; i++) { var c = mk('div'); c.style.opacity = '.6'; c.appendChild(mk('span', '', 'CPU ' + (i - net.list.length + 1))); c.appendChild(mk('span', '', 'COMPUTER')); list.appendChild(c); }
    panel.appendChild(list);
    if (net.host) {
      var many = net.list.length >= 2;
      var go = btn(many ? 'START GAME' : 'WAITING FOR PLAYERS', 'big-btn', startOnline);
      go.disabled = !many; if (!many) go.style.opacity = '.4';
      panel.appendChild(go);
    }
    panel.appendChild(btn('LEAVE', 'linkbtn', function () { leaveNet(); }));
  }
  function startOnline() {
    if (!net || !net.host || net.list.length < 2) return;
    var humans = net.list.slice(0, 6);
    var payload = { order: humans.map(function (h) { return { uid: h.uid, name: h.name }; }), total: Math.min(6, Math.max(net.total, humans.length)), dice2: dice2 };
    net.ch.send({ type: 'broadcast', event: 'start', payload: payload });
    startNet(payload);
  }
  function startNet(pl) {
    if (window.Auth && Auth.play) Auth.play('wahoo-online', { now: true });
    net.state = 'play'; net.ev = 0; net.queue = {}; net.gone = {};
    dice2 = !!pl.dice2;
    var list = pl.order.map(function (h) { return { kind: h.uid === net.uid ? 'me' : 'remote', name: h.name, uid: h.uid }; });
    if (!list.some(function (x) { return x.kind === 'me'; })) { leaveNet(); notice('THE GAME ALREADY STARTED.'); return; }
    for (var i = list.length; i < pl.total; i++) list.push({ kind: 'cpu', name: 'CPU ' + (i - pl.order.length + 1) });
    gameId++;
    hideOv();
    setupPlayers(list);
  }
  function watchSeats() {   // someone dropped out mid-game: the host's computer takes over their seat
    if (!net || !players) return;
    var here = {}; net.list.forEach(function (x) { here[x.uid] = true; });
    var hostHere = net.list.some(function (x) { return x.host; });
    if (!net.host && !hostHere && !net.gone.host) {
      net.gone.host = setTimeout(function () {
        if (net && !net.list.some(function (x) { return x.host; }) && phase !== 'over') { gameId++; phase = 'over'; var t = 'THE HOST LEFT. GAME OVER.'; leaveNet(); notice(t); showSetup(); }
        else if (net) net.gone.host = null;
      }, 5000);
    }
    players.forEach(function (p) {
      if (p.kind !== 'remote' || here[p.uid] || net.gone[p.uid]) return;
      net.gone[p.uid] = setTimeout(function () {
        net && delete net.gone[p.uid];
        if (!net || net.list.some(function (x) { return x.uid === p.uid; }) || p.kind !== 'remote') return;
        if (net.host) { net.ch.send({ type: 'broadcast', event: 'takeover', payload: { uid: p.uid } }); applyTakeover(p.uid); }
      }, 4000);
    });
  }
  function applyTakeover(uid) {
    players.forEach(function (p) { if (p.uid === uid && p.kind === 'remote') { p.kind = 'cpu'; p.name = p.name + ' (CPU)'; } });
    legend();
    var p = cur();
    if (net && net.host && p.kind === 'cpu') {
      if (phase === 'await') promptRoll();
      else if (phase === 'wait') nextDie();
    }
  }

  /* ---------- input ---------- */
  function toLogical(e) {
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width) - CX, y = (e.clientY - rect.top) * (W / rect.height) - CY;
    var c = Math.cos(viewAngle), sn = Math.sin(viewAngle);
    return { x: CX + x * c + y * sn, y: CY - x * sn + y * c };
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
    if (best.list.length === 1) { playMove(best.list[0]); return; }
    phase = 'choose'; chooseFor = best.list;
    setMsg('TAP WHERE TO GO.');
  });
  $('roll').addEventListener('click', function () {
    if (phase === 'await' && cur().kind === 'me') doRoll();
  });
  document.addEventListener('keydown', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen() || e.target.tagName === 'INPUT') return;
    if ((e.key === ' ' || e.key === 'Enter') && phase === 'await' && cur() && cur().kind === 'me' && document.activeElement.tagName !== 'BUTTON') {
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
  function drawPorts() {   // each player's center port: 6 holes past their start hole
    if (!players) return;
    players.forEach(function (p) {
      var q = TRACK_XY[(SIDE * p.seat + PORT) % TRACK];
      cx.save(); cx.globalAlpha = 0.3; cx.setLineDash([3, 5]); cx.lineWidth = 2; cx.strokeStyle = COLORS[p.seat];
      cx.beginPath(); cx.moveTo(q.x, q.y); cx.lineTo(CX, CY); cx.stroke(); cx.restore();
      ring(q.x, q.y, mode === 'cross' ? 14 : 11, COLORS[p.seat], 2);
    });
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
    cx.save();
    cx.translate(CX, CY); cx.rotate(viewAngle); cx.translate(-CX, -CY);   // your color sits at the bottom
    drawBoard();
    drawPorts();
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
    cx.restore();
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
  $('online').addEventListener('click', openOnline);
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
    'Race your 4 marbles clockwise around the board and into your home row. Play against computers, or with friends online.',
    'Roll a 1 or a 6 to bring a marble out onto your start hole. With two dice, play each die on any marble, in whichever order you like.',
    'Every die that shows a 1 or a 6 and gets played is rolled again, and only that die. Doubles roll both dice again. If you cannot move, your turn ends with no reroll.',
    'Never land on or pass your own marbles. Land exactly on another color to send it back. You need an exact count to settle into your home row.',
    'Your port is the ringed hole 6 spaces past your start. Only if you land on it with a 1 or a 6 does it drop you into the center. A marble that stops there on any other number just sits on the hole. It leaves the center only on a 1 and lands 8 spaces behind your start hole.',
    'The first player to get all 4 marbles home wins. When more than one move is possible, tap a glowing marble to move it.'
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
