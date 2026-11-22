/* BANJO: bingo with a golden retriever in the middle. B 1-15, A 16-30, N 31-45, J 46-60, O 61-75.
   Solo against computer cards, or online: the host calls the numbers and checks every BANJO claim. */
(function () {
  'use strict';
  var GAME = 'banjo', LET = ['B', 'A', 'N', 'J', 'O'], COL = ['#ff4d5e', '#ffc83d', '#7dff6b', '#3ef0ff', '#e86bff'];
  var DOG = '<svg viewBox="0 0 64 64" role="img" aria-label="White golden retriever"><ellipse cx="13" cy="32" rx="9" ry="16" fill="#e2c88c" stroke="#b79556" stroke-width="2" transform="rotate(12 13 32)"/><ellipse cx="51" cy="32" rx="9" ry="16" fill="#e2c88c" stroke="#b79556" stroke-width="2" transform="rotate(-12 51 32)"/><ellipse cx="32" cy="32" rx="18" ry="19" fill="#fbf5e6" stroke="#d9c48e" stroke-width="2"/><path d="M24 15 Q28 20 32 15 Q36 20 40 15" fill="none" stroke="#efe2bf" stroke-width="2"/><ellipse cx="32" cy="42" rx="11" ry="8.5" fill="#fffaf0"/><circle cx="25" cy="30" r="2.8" fill="#2a1b12"/><circle cx="39" cy="30" r="2.8" fill="#2a1b12"/><circle cx="26" cy="29" r="0.9" fill="#fff"/><circle cx="40" cy="29" r="0.9" fill="#fff"/><ellipse cx="32" cy="38" rx="4" ry="2.8" fill="#1a1210"/><path d="M32 40.5 V44 M32 44 Q28 47.5 24.5 44.5 M32 44 Q36 47.5 39.5 44.5" fill="none" stroke="#5a3b2a" stroke-width="1.6" stroke-linecap="round"/><path d="M29 46 Q32 54 35 46 Z" fill="#ff8aa5"/></svg>';
  var LINES = [], i, j;
  for (i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map(function (c) { return i * 5 + c; })); LINES.push([0, 1, 2, 3, 4].map(function (r) { return r * 5 + i; })); }
  LINES.push([0, 6, 12, 18, 24]); LINES.push([4, 8, 12, 16, 20]);

  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = mk('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function shuffle(a) { a = a.slice(); for (var k = a.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = a[k]; a[k] = a[r]; a[r] = t; } return a; }
  function colOf(n) { return Math.floor((n - 1) / 15); }
  function makeCard() {
    var c = [], col, r, nums;
    for (col = 0; col < 5; col++) {
      var pool = []; for (j = 1; j <= 15; j++) pool.push(col * 15 + j);
      nums = shuffle(pool).slice(0, 5);
      for (r = 0; r < 5; r++) c[r * 5 + col] = nums[r];
    }
    c[12] = 0;
    return c;
  }
  function validCard(c) {
    if (!c || c.length !== 25) return false;
    var seen = {};
    for (var k = 0; k < 25; k++) {
      if (k === 12) { if (c[k] !== 0) return false; continue; }
      var n = c[k];
      if (typeof n !== 'number' || n < 1 || n > 75 || colOf(n) !== k % 5 || seen[n]) return false;
      seen[n] = 1;
    }
    return true;
  }
  function lineDone(card, ok) {
    for (var l = 0; l < LINES.length; l++) {
      var L = LINES[l], all = true;
      for (var q = 0; q < 5; q++) if (L[q] !== 12 && !ok(card[L[q]], L[q])) { all = false; break; }
      if (all) return L;
    }
    return null;
  }

  var cfg = { cpus: 2, speed: 4000, auto: 1 };
  var gid = 0, phase = 'setup', calls = [], called = {}, order = [], mine = null, marks = [], cpus = [], over = false, timer = null, net = null;
  var cells = [], cellEls = [], boardEls = {};

  function setMsg(t) { $('msg').textContent = t; }
  function seg(id, key) {
    var s = $(id);
    Array.prototype.forEach.call(s.children, function (b) {
      b.addEventListener('click', function () { cfg[key] = +b.dataset.n; Array.prototype.forEach.call(s.children, function (x) { x.classList.toggle('on', x === b); }); });
    });
  }
  seg('cpus', 'cpus'); seg('speed', 'speed'); seg('auto', 'auto');

  /* ---------- screens ---------- */
  function showSetup() {
    gid++; clearTimeout(timer); leaveNet(); phase = 'setup';
    $('game').hidden = true; $('setup').hidden = false;
    var cd = document.querySelector('.cd'); if (cd) cd.remove();
  }
  function buildBoard() {
    var b = $('cboard'); b.textContent = ''; boardEls = {};
    for (var r = 0; r < 5; r++) {
      var h = mk('i', 'h', LET[r]); h.style.setProperty('--c', COL[r]); b.appendChild(h);
      for (j = 1; j <= 15; j++) { var n = r * 15 + j, e = mk('i', '', String(n)); e.style.setProperty('--c', COL[r]); b.appendChild(e); boardEls[n] = e; }
    }
  }
  function buildCard() {
    var c = $('card'); c.textContent = ''; cellEls = [];
    for (var k = 0; k < 5; k++) { var h = mk('div', 'hd', LET[k]); h.style.setProperty('--c', COL[k]); c.appendChild(h); }
    for (k = 0; k < 25; k++) {
      (function (k) {
        var b = mk('button'); b.type = 'button';
        if (k === 12) { b.className = 'free'; b.innerHTML = DOG; b.setAttribute('aria-label', 'Free space'); }
        else { b.textContent = String(mine[k]); b.style.setProperty('--c', COL[k % 5]); b.setAttribute('aria-label', LET[k % 5] + ' ' + mine[k]); b.addEventListener('click', function () { tap(k); }); }
        c.appendChild(b); cellEls.push(b);
      })(k);
    }
  }
  function paintCard() {
    cellEls.forEach(function (b, k) { if (k !== 12) b.classList.toggle('mk', !!marks[k]); });
    $('claim').classList.toggle('glow', !!(phase === 'play' && !over && lineDone(mine, function (n, k) { return marks[k]; })));
  }
  function paintCaller() {
    var n = calls[calls.length - 1], ball = $('ball');
    if (!n) { ball.innerHTML = '<b>-</b><span>-</span>'; ball.style.removeProperty('--c'); }
    else { ball.innerHTML = '<b>' + LET[colOf(n)] + '</b><span>' + n + '</span>'; ball.style.setProperty('--c', COL[colOf(n)]); }
    var r = $('recent'); r.textContent = '';
    calls.slice(-7, -1).reverse().forEach(function (m) { var e = mk('i', '', LET[colOf(m)] + m); e.style.setProperty('--c', COL[colOf(m)]); r.appendChild(e); });
    $('cnt').textContent = calls.length + ' OF 75 CALLED';
  }
  function others() {
    if (net) $('others').textContent = 'ONLINE: ' + net.list.map(function (p) { return p.uid === net.uid ? 'YOU' : p.name; }).join(', ');
    else $('others').textContent = 'PLAYING AGAINST ' + cpus.map(function (c) { return c.name; }).join(', ');
  }

  /* ---------- a game ---------- */
  function newGame(role) {   // role: 'solo' | 'host' | 'guest'
    gid++; clearTimeout(timer); over = false;
    calls = []; called = {}; order = role === 'guest' ? [] : shuffle(Array.apply(null, Array(75)).map(function (_, k) { return k + 1; }));
    mine = makeCard(); marks = []; marks[12] = true;
    cpus = []; if (role === 'solo') for (var k = 1; k <= cfg.cpus; k++) cpus.push({ name: 'CPU ' + k, card: makeCard(), sent: false });
    $('setup').hidden = true; $('game').hidden = false;
    buildBoard(); buildCard(); paintCaller(); others(); setMsg('GET READY!');
    $('claim').classList.remove('glow');
    phase = 'count';
    var g = gid, steps = ['3', '2', '1', 'GO'], si = 0;
    var cd = mk('div', 'cd', steps[0]); document.body.appendChild(cd);
    setTimeout(function tick() {
      if (g !== gid) { cd.remove(); return; }
      si++;
      if (si < steps.length) { cd.textContent = steps[si]; setTimeout(tick, si === 3 ? 500 : 800); return; }
      cd.remove(); phase = 'play'; setMsg('LISTEN FOR YOUR NUMBERS!'); paintCard();
      if (role !== 'guest') drawNext();
    }, 800);
    if (role === 'guest') {   // calls arrive from the host
      timer = null;
    }
  }
  function addCall(n) {
    calls.push(n); called[n] = 1;
    if (boardEls[n]) boardEls[n].classList.add('on');
    paintCaller();
    if (cfg.auto) for (var k = 0; k < 25; k++) if (mine[k] === n) marks[k] = true;
    setMsg(LET[colOf(n)] + ' ' + n + (onCard(n) ? '. YOU HAVE IT!' : ''));
    paintCard();
    cpus.forEach(function (c) {
      if (c.sent || over) return;
      if (lineDone(c.card, function (m) { return called[m]; })) {
        c.sent = true; var g = gid;
        setTimeout(function () { if (g === gid && !over) finish({ kind: 'cpu', name: c.name }, null); }, 1400 + Math.random() * 1400);
      }
    });
  }
  function onCard(n) { return mine.indexOf(n) > -1; }
  function drawNext() {
    if (over || phase !== 'play') return;
    if (calls.length >= 75) { finish(null, null); return; }
    var n = order[calls.length];
    addCall(n);
    if (net && net.host) net.ch.send({ type: 'broadcast', event: 'call', payload: { calls: calls.slice() } });
    var g = gid;
    timer = setTimeout(function () { if (g === gid) drawNext(); }, cfg.speed);
  }
  function tap(k) {
    if (over || phase !== 'play') return;
    if (marks[k]) { marks[k] = false; paintCard(); return; }
    if (called[mine[k]]) { marks[k] = true; paintCard(); }
    else { setMsg('THAT NUMBER HAS NOT BEEN CALLED YET.'); shakeCard(); }
  }
  function shakeCard() { var c = $('card'); c.classList.add('shake'); setTimeout(function () { c.classList.remove('shake'); }, 300); }
  function claim() {
    if (over || phase !== 'play') return;
    if (net && !net.host) { net.ch.send({ type: 'broadcast', event: 'claim', payload: { uid: net.uid, name: net.name, card: mine } }); setMsg('CHECKING YOUR CARD...'); return; }
    var line = lineDone(mine, function (n) { return called[n]; });
    if (!line) { miss(); return; }
    if (net) net.ch.send({ type: 'broadcast', event: 'win', payload: { uid: net.uid, name: net.name, line: line } });
    finish({ kind: 'me', name: 'YOU' }, line);
  }
  function miss() { setMsg('NOT YET. KEEP LOOKING!'); shakeCard(); }
  function finish(winner, line) {
    if (over) return;
    over = true; phase = 'over'; clearTimeout(timer); $('claim').classList.remove('glow');
    var won = winner && winner.kind === 'me';
    if (won && line) line.forEach(function (k) { if (cellEls[k]) cellEls[k].classList.add('win'); });
    var rivals = net ? Math.max(0, net.list.length - 1) : cfg.cpus;
    var score = won ? (76 - calls.length) * 10 + 100 * rivals : 0;
    setMsg(won ? 'BANJO! YOU WIN!' : winner ? winner.name + ' CALLED BANJO!' : 'NO WINNER THIS TIME.');
    var g = gid;
    Endgame.show({
      key: GAME, title: won ? 'BANJO! YOU WIN!' : winner ? 'GAME OVER' : 'DRAW',
      color: won ? '#7dff6b' : '#ff7b8a',
      line: won ? 'WON ON CALL ' + calls.length + ' OF 75' : winner ? winner.name + ' CALLED BANJO FIRST' : 'ALL 75 NUMBERS WERE CALLED',
      score: score, delay: 900, onAgain: showSetup
    });
  }
  $('claim').addEventListener('click', claim);
  $('start').addEventListener('click', function () { leaveNet(); newGame('solo'); });

  /* ---------- online (Supabase Realtime: presence + broadcast) ---------- */
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
    p.appendChild(mk('h2', '', 'ONLINE BANJO'));
    p.appendChild(mk('div', 'line', 'PLAY WITH FRIENDS ON THEIR OWN DEVICES. THE HOST CALLS THE NUMBERS AT THE SPEED CHOSEN ON THE SETUP SCREEN.'));
    p.appendChild(btn('CREATE ROOM', 'big-btn', function () { netJoin(randCode(), true); }));
    var code = mk('input'); code.maxLength = 4; code.placeholder = 'CODE'; code.autocapitalize = 'characters'; code.autocomplete = 'off'; code.spellcheck = false; code.setAttribute('aria-label', 'Room code');
    code.style.cssText = 'width:140px;text-align:center;text-transform:uppercase;font-family:inherit;font-size:18px;letter-spacing:6px;padding:10px 6px 10px 12px;border:2px solid var(--cyan);border-radius:8px;background:var(--tile);color:var(--ink)';
    var row = mk('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:center;width:100%';
    var err = mk('div', 'err');
    row.appendChild(code);
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
      var ch = Auth.client.channel('banjo-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
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
          if (list.length > 8) { leaveNet(); notice('THAT ROOM IS FULL.'); return; }
          if (!net.host && !hostHere) { if (net.joined && prev) { leaveNet(); notice('THE HOST LEFT.'); } }
          else lobbyView();
        } else {
          others();
          if (!net.host && !hostHere && !net.hostTimer) net.hostTimer = setTimeout(function () {
            if (net && !net.list.some(function (x) { return x.host; })) { leaveNet(); showSetup(); notice('THE HOST LEFT. GAME OVER.'); } else if (net) net.hostTimer = null;
          }, 5000);
        }
      });
      ch.on('broadcast', { event: 'start' }, function (m) { if (net && net.ch === ch && net.state === 'lobby') { net.state = 'play'; cfg.speed = m.payload.speed; hideOv(); newGame('guest'); } });
      ch.on('broadcast', { event: 'call' }, function (m) {
        if (!net || net.ch !== ch || net.host) return;
        var list = m.payload.calls || [];
        for (var k = calls.length; k < list.length; k++) addCall(list[k]);
      });
      ch.on('broadcast', { event: 'claim' }, function (m) {
        if (!net || net.ch !== ch || !net.host || over) return;
        var pl = m.payload, ok = validCard(pl.card) && lineDone(pl.card, function (n) { return called[n]; });
        if (ok) { net.ch.send({ type: 'broadcast', event: 'win', payload: { uid: pl.uid, name: pl.name, line: ok } }); finish({ kind: 'remote', name: pl.name }, null); }
        else net.ch.send({ type: 'broadcast', event: 'bad', payload: { uid: pl.uid } });
      });
      ch.on('broadcast', { event: 'win' }, function (m) { if (net && net.ch === ch && !net.host) finish(m.payload.uid === net.uid ? { kind: 'me', name: 'YOU' } : { kind: 'remote', name: m.payload.name }, m.payload.uid === net.uid ? m.payload.line : null); });
      ch.on('broadcast', { event: 'bad' }, function (m) { if (net && net.ch === ch && m.payload.uid === net.uid) miss(); });
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
    p.appendChild(mk('div', 'line', net.host ? 'SHARE THIS CODE. START WHEN EVERYONE HAS JOINED.' : 'WAITING FOR THE HOST TO START...'));
    var list = mk('div', 'table');
    net.list.forEach(function (x) {
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
    net.state = 'play';
    net.ch.send({ type: 'broadcast', event: 'start', payload: { speed: cfg.speed } });
    hideOv();
    newGame('host');
    setTimeout(function () { }, 0);
  }
  $('online').addEventListener('click', openOnline);

  $('help').addEventListener('click', function () {
    HowTo.show({ title: 'HOW TO PLAY BANJO', steps: [
      'Numbers are called one at a time. B is 1 to 15, A is 16 to 30, N is 31 to 45, J is 46 to 60, O is 61 to 75.',
      'If the called number is on your card, tap it to mark it. With auto-daub on, your card marks itself.',
      'The golden retriever in the middle is a free space.',
      'Mark five in a row, down, across or corner to corner, then press BANJO! The first player to call it wins.',
      'Press too early and nothing bad happens. Keep looking and try again.',
      'Online, one player creates a room and shares the 4-letter code. The host calls the numbers and checks every BANJO.'
    ] });
  });
  Auth.require();
})();
