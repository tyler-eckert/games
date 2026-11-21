(function () {
  var SAVE = 'arcade.sudoku.save', ERR_KEY = 'arcade.sudoku.errors';
  var BASE = { easy: 1000, medium: 2000, hard: 3000, daily: 2000 };
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $('grid'), numsEl = $('nums');

  var level = 'easy', puzzle, solution, vals, notes, secs = 0, hints = 0, sel = -1;
  var notesMode = false, showErrors = true, won = false, hist = [], cells = [], timer = null;
  var race = null, raceStart = 0, lastProg = 0;

  try { showErrors = localStorage.getItem(ERR_KEY) !== '0'; } catch (e) {}

  /* ---------- helpers ---------- */
  function rc(i) { return [(i / 9) | 0, i % 9]; }
  function peer(a, b) {
    var ra = (a / 9) | 0, ca = a % 9, rb = (b / 9) | 0, cb = b % 9;
    return ra === rb || ca === cb || (((ra / 3) | 0) === ((rb / 3) | 0) && ((ca / 3) | 0) === ((cb / 3) | 0));
  }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function isGiven(i) { return puzzle[i] !== 0; }
  function progress() { return vals.some(function (v, i) { return v && !isGiven(i); }); }

  /* ---------- game flow ---------- */
  function newGame(lv) {
    level = lv;
    Array.prototype.forEach.call(document.querySelectorAll('.lv'), function (b) { b.classList.toggle('on', b.dataset.lv === level); });
    var rnd = level === 'daily' ? SudokuEngine.mulberry32(SudokuEngine.dailySeed()) : Math.random;
    var gen = SudokuEngine.generate(level, rnd);
    puzzle = gen.puzzle; solution = gen.solution;
    vals = puzzle.slice(); notes = new Array(81).fill(0);
    secs = 0; hints = 0; sel = -1; won = false; hist = []; notesMode = false;
    Endgame.hide();
    buildGrid(); render(); save();
  }
  function save() {
    if (race) return;   // a race never touches the saved solo game
    try {
      if (won) localStorage.removeItem(SAVE);
      else localStorage.setItem(SAVE, JSON.stringify({ level: level, puzzle: puzzle, solution: solution, vals: vals, notes: notes, secs: secs, hints: hints }));
    } catch (e) {}
  }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(SAVE));
      if (!o || !BASE[o.level] || o.puzzle.length !== 81 || o.solution.length !== 81 || o.vals.length !== 81) return false;
      level = o.level; puzzle = o.puzzle; solution = o.solution; vals = o.vals; notes = o.notes;
      secs = o.secs | 0; hints = o.hints | 0; sel = -1; won = false; hist = []; notesMode = false;
      Array.prototype.forEach.call(document.querySelectorAll('.lv'), function (b) { b.classList.toggle('on', b.dataset.lv === level); });
      buildGrid(); render();
      return true;
    } catch (e) { return false; }
  }

  function setCell(i, v, n) {
    hist.push({ i: i, v: vals[i], n: notes[i], peers: null });
    vals[i] = v; notes[i] = n;
  }
  function place(d) {
    if (won || sel < 0 || isGiven(sel)) return;
    if (notesMode && !vals[sel]) {
      hist.push({ i: sel, v: vals[sel], n: notes[sel] });
      notes[sel] ^= (1 << d);
    } else {
      if (vals[sel] === d) return;
      var batch = [{ i: sel, v: vals[sel], n: notes[sel] }];
      vals[sel] = d; notes[sel] = 0;
      for (var k = 0; k < 81; k++) {
        if (k !== sel && !vals[k] && (notes[k] & (1 << d)) && peer(k, sel)) {
          batch.push({ i: k, v: 0, n: notes[k] });
          notes[k] &= ~(1 << d);
        }
      }
      hist.push({ batch: batch });
    }
    render(); save(); raceProgress(); checkWin();
  }
  function erase() {
    if (won || sel < 0 || isGiven(sel) || (!vals[sel] && !notes[sel])) return;
    hist.push({ i: sel, v: vals[sel], n: notes[sel] });
    vals[sel] = 0; notes[sel] = 0;
    render(); save(); raceProgress();
  }
  function undo() {
    if (won || !hist.length) return;
    var h = hist.pop();
    if (h.batch) h.batch.forEach(function (b) { vals[b.i] = b.v; notes[b.i] = b.n; });
    else { vals[h.i] = h.v; notes[h.i] = h.n; }
    render(); save(); raceProgress();
  }
  function hint() {
    if (won || race) return;
    var target = -1;
    if (sel >= 0 && !isGiven(sel) && vals[sel] !== solution[sel]) target = sel;
    else {
      var wrong = [];
      for (var k = 0; k < 81; k++) if (vals[k] !== solution[k]) wrong.push(k);
      if (!wrong.length) return;
      target = wrong[Math.floor(Math.random() * wrong.length)];
      sel = target;
    }
    hist.push({ batch: [{ i: target, v: vals[target], n: notes[target] }] });
    vals[target] = solution[target]; notes[target] = 0;
    hints++;
    render(); save(); checkWin();
  }
  function checkWin() {
    for (var i = 0; i < 81; i++) if (vals[i] !== solution[i]) return;
    if (race) { raceFinish(); return; }
    won = true;
    clearInterval(timer); timer = null;
    save();
    var score = secs + hints * 30;   // solve time in seconds; each hint adds 30s
    Endgame.show({
      key: 'sudoku-' + level, title: 'SOLVED!', color: '#7dff6b',
      line: level.toUpperCase() + ' IN ' + fmt(secs) + (hints ? ' + ' + hints * 30 + 'S FOR ' + hints + (hints === 1 ? ' HINT' : ' HINTS') : ''),
      score: score, delay: 500, onAgain: function () { newGame(level); }
    });
  }

  /* ---------- rendering ---------- */
  function buildGrid() {
    gridEl.textContent = '';
    cells = [];
    for (var i = 0; i < 81; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.i = i;
      b.setAttribute('role', 'gridcell');
      var r = (i / 9) | 0, c = i % 9;
      b.className = 'sc' + (c === 2 || c === 5 ? ' br' : '') + (r === 2 || r === 5 ? ' bb' : '');
      gridEl.appendChild(b);
      cells.push(b);
    }
    numsEl.textContent = '';
    for (var d = 1; d <= 9; d++) {
      var nb = document.createElement('button');
      nb.type = 'button'; nb.dataset.d = d;
      nb.innerHTML = d + '<small></small>';
      nb.setAttribute('aria-label', 'Number ' + d);
      numsEl.appendChild(nb);
    }
  }
  function render() {
    var selVal = sel >= 0 ? vals[sel] : 0, counts = new Array(10).fill(0), i;
    for (i = 0; i < 81; i++) {
      var b = cells[i], v = vals[i], cls = 'sc' + (b.className.indexOf(' br') > -1 ? ' br' : '') + (b.className.indexOf(' bb') > -1 ? ' bb' : '');
      if (v) counts[v]++;
      if (isGiven(i)) cls += ' given'; else if (v) cls += ' mine';
      if (sel >= 0) {
        if (i === sel) cls += ' sel';
        else if (selVal && v === selVal) cls += ' same';
        else if (peer(i, sel)) cls += ' peer';
      }
      if (showErrors && v && !isGiven(i) && v !== solution[i]) cls += ' bad';
      b.className = cls;
      if (v) {
        b.textContent = v;
        b.setAttribute('aria-label', 'Row ' + (((i / 9) | 0) + 1) + ' column ' + (i % 9 + 1) + ', ' + v + (isGiven(i) ? ', given' : ''));
      } else if (notes[i]) {
        var h = '<span class="notes">';
        for (var d = 1; d <= 9; d++) h += '<span>' + ((notes[i] & (1 << d)) ? d : '') + '</span>';
        b.innerHTML = h + '</span>';
        b.setAttribute('aria-label', 'Row ' + (((i / 9) | 0) + 1) + ' column ' + (i % 9 + 1) + ', empty with notes');
      } else {
        b.textContent = '';
        b.setAttribute('aria-label', 'Row ' + (((i / 9) | 0) + 1) + ' column ' + (i % 9 + 1) + ', empty');
      }
    }
    Array.prototype.forEach.call(numsEl.children, function (nb, k) {
      var d = k + 1, left = 9 - counts[d];
      nb.disabled = left <= 0;
      nb.querySelector('small').textContent = left > 0 ? left : '';
    });
    $('notes').textContent = 'NOTES: ' + (notesMode ? 'ON' : 'OFF');
    $('notes').setAttribute('aria-pressed', notesMode ? 'true' : 'false');
    $('errors').textContent = 'ERRORS: ' + (showErrors ? 'ON' : 'OFF');
    $('errors').setAttribute('aria-pressed', showErrors ? 'true' : 'false');
    $('undo').disabled = !hist.length || won;
    $('time').textContent = fmt(secs);
  }

  /* ---------- input ---------- */
  gridEl.addEventListener('click', function (e) {
    var b = e.target.closest('.sc');
    if (!b) return;
    sel = +b.dataset.i;
    render();
  });
  numsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-d]');
    if (b && !b.disabled) place(+b.dataset.d);
  });
  $('erase').addEventListener('click', erase);
  $('undo').addEventListener('click', undo);
  $('hint').addEventListener('click', hint);
  $('notes').addEventListener('click', function () { notesMode = !notesMode; render(); });
  $('errors').addEventListener('click', function () {
    showErrors = !showErrors;
    try { localStorage.setItem(ERR_KEY, showErrors ? '1' : '0'); } catch (e) {}
    render();
  });
  $('new').addEventListener('click', function () {
    if (race) return;
    if (!won && progress() && !window.confirm('Start a new ' + level + ' puzzle?')) return;
    newGame(level);
  });
  $('levels').addEventListener('click', function (e) {
    var b = e.target.closest('.lv');
    if (race || !b || b.dataset.lv === level) return;
    if (!won && progress() && !window.confirm('Switch to ' + b.dataset.lv + ' and start a new puzzle?')) return;
    newGame(b.dataset.lv);
  });
  document.addEventListener('keydown', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k >= '1' && k <= '9') { place(+k); return; }
    if (k === '0' || k === 'Backspace' || k === 'Delete') { e.preventDefault(); erase(); return; }
    if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); return; }
    if (k === 'z' || k === 'Z') { undo(); return; }
    var d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
    if (d !== undefined) {
      e.preventDefault();
      var n = sel < 0 ? 40 : sel + d, r = (sel / 9) | 0;
      if (sel >= 0 && ((d === -1 && sel % 9 === 0) || (d === 1 && sel % 9 === 8))) return;
      if (n >= 0 && n < 81) { sel = n; render(); cells[sel].focus(); }
    }
  });

  var HELP = [
    'Fill the grid so every row, every column and every 3x3 box contains the digits 1 to 9 exactly once.',
    'Tap a square, then tap a number. The small count on each number shows how many are left to place.',
    'Turn NOTES on to jot small pencil marks instead of a final answer. ERRORS highlights wrong numbers right away, and you can turn it off for a real challenge.',
    'Stuck? HINT fills in one square and adds 30 seconds to your time. Your score is your solve time, so faster is better. DAILY gives everyone the same puzzle today. Your game is saved if you leave.',
    'RACE lets you play the same puzzle at the same time as friends who are signed in. One person creates a room and shares the 4-letter code, everyone joins, and the host starts the countdown. First to finish wins.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  setInterval(function () {
    if (race) {
      if (race.state === 'play' && !won) { secs = Math.floor((Date.now() - raceStart) / 1000); $('time').textContent = fmt(secs); }
      return;
    }
    if (won || document.hidden || HowTo.isOpen() || !vals) return;
    secs++;
    $('time').textContent = fmt(secs);
    if (secs % 5 === 0) save();
  }, 1000);


  /* ---------- online race (Supabase Realtime: presence + broadcast) ---------- */
  var raceOv = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function showOv(solid) {
    if (!raceOv) {
      raceOv = el('div', 'overlay'); raceOv.setAttribute('role', 'dialog'); raceOv.setAttribute('aria-modal', 'true');
      document.body.appendChild(raceOv);
    }
    raceOv.style.background = solid ? '#0b0a1f' : '';
    raceOv.hidden = false; raceOv.textContent = '';
    var panel = el('div', 'panel'); raceOv.appendChild(panel);
    return panel;
  }
  function hideOv() { if (raceOv) raceOv.hidden = true; }
  function btn(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  function openRace() {
    if (race || HowTo.isOpen()) return;
    if (!navigator.onLine || !Auth.client) { roomGone('YOU ARE OFFLINE. RACES NEED A CONNECTION.'); return; }
    var lv = level === 'daily' ? 'easy' : level;
    var panel = showOv();
    panel.appendChild(el('h2', '', 'SUDOKU RACE'));
    panel.appendChild(el('div', 'line', 'SAME PUZZLE, SAME TIME. FIRST TO FINISH WINS.'));
    var seg = el('div', 'seg'); seg.style.width = '100%';
    ['easy', 'medium', 'hard'].forEach(function (l) {
      var b = btn(l.toUpperCase(), 'lv' + (l === lv ? ' on' : ''), function () {
        lv = l; Array.prototype.forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); });
      });
      seg.appendChild(b);
    });
    panel.appendChild(seg);
    panel.appendChild(btn('CREATE ROOM', 'big-btn', function () { joinRoom(randCode(), true, lv); }));
    var code = el('input'); code.maxLength = 4; code.placeholder = 'CODE'; code.autocapitalize = 'characters'; code.autocomplete = 'off'; code.spellcheck = false;
    code.setAttribute('aria-label', 'Room code');
    code.style.cssText = 'width:140px;text-align:center;text-transform:uppercase;font-family:inherit;font-size:18px;letter-spacing:6px;padding:10px 6px 10px 12px;border:2px solid var(--cyan);border-radius:8px;background:var(--tile);color:var(--ink)';
    var row = el('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:center;width:100%';
    var jb = btn('JOIN', 'big-btn', function () {
      var c = code.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (c.length !== 4) { msg.textContent = 'ENTER THE 4-LETTER CODE.'; return; }
      joinRoom(c, false, lv);
    });
    jb.className = 'big-btn alt'; row.appendChild(code); row.appendChild(jb); panel.appendChild(row);
    var msg = el('div', 'err'); panel.appendChild(msg);
    panel.appendChild(btn('CANCEL', 'linkbtn', hideOv));
  }
  function randCode() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = '';
    for (var i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    return c;
  }

  function joinRoom(code, host, lv) {
    Auth.session().then(function (sess) {
      if (!sess) return;
      var uid = sess.user.id, name = Scores.playerName(sess);
      var ch = Auth.client.channel('sudoku-race-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
      race = { ch: ch, code: code, host: host, level: lv, uid: uid, name: name, players: [], prog: {}, finishes: [], state: 'lobby', note: '', total: 0, joined: false };
      lobbyView('CONNECTING…');
      ch.on('presence', { event: 'sync' }, function () {
        if (!race || race.ch !== ch) return;
        var st = ch.presenceState(), list = [];
        Object.keys(st).forEach(function (k) { var m = st[k][0]; if (m) list.push({ uid: k, name: m.name, host: !!m.host }); });
        list.sort(function (a, b) { return (b.host - a.host) || (a.name < b.name ? -1 : 1); });
        var prev = race.players.length;
        race.players = list;
        if (race.state === 'lobby') {
          if (!race.host && !list.some(function (p) { return p.host; })) { if (race.joined && prev) roomGone('THE HOST LEFT.'); }
          else lobbyView();
        } else if (race.state === 'play') raceBar();
      });
      ch.on('broadcast', { event: 'start' }, function (m) { if (race && race.ch === ch && race.state === 'lobby') countdown(m.payload); });
      ch.on('broadcast', { event: 'progress' }, function (m) { if (race && race.ch === ch) { race.prog[m.payload.uid] = m.payload.n; raceBar(); } });
      ch.on('broadcast', { event: 'finish' }, function (m) {
        if (!race || race.ch !== ch) return;
        race.finishes.push(m.payload);
        if (race.state === 'play' && !won) race.note = m.payload.name + ' FINISHED IN ' + fmt(m.payload.secs) + '!';
        raceBar();
      });
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          ch.track({ name: name, host: host });
          race.joined = true;
          if (!host) {
            setTimeout(function () {
              if (race && race.ch === ch && race.state === 'lobby' && !race.players.some(function (p) { return p.host; })) roomGone('NO ROOM WITH THAT CODE.');
            }, 3500);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (race && race.ch === ch && race.state === 'lobby') roomGone('COULD NOT CONNECT. TRY AGAIN.');
        }
      });
    });
  }
  function dropChannel() {
    if (race && race.ch) { try { Auth.client.removeChannel(race.ch); } catch (e) {} }
  }
  function roomGone(text) {
    dropChannel(); race = null;
    var panel = showOv();
    panel.appendChild(el('h2', '', 'RACE'));
    panel.appendChild(el('div', 'line', text));
    panel.appendChild(btn('OK', 'big-btn', function () { hideOv(); }));
  }
  function lobbyView(status) {
    if (!race || race.state !== 'lobby') return;
    var panel = showOv();
    panel.appendChild(el('h2', '', 'ROOM ' + race.code));
    panel.appendChild(el('div', 'line', race.host ? 'SHARE THIS CODE. START WHEN EVERYONE HAS JOINED.' : 'WAITING FOR THE HOST TO START…'));
    if (race.host) panel.appendChild(el('div', 'score', race.level.toUpperCase()));
    var list = el('div', 'table');
    race.players.forEach(function (p) {
      var d = el('div', p.uid === race.uid ? 'me' : '');
      d.appendChild(el('span', '', (p.uid === race.uid ? 'YOU' : p.name)));
      d.appendChild(el('span', '', p.host ? 'HOST' : 'READY'));
      list.appendChild(d);
    });
    if (!race.players.length) list.appendChild(el('div', '', status || 'CONNECTING…'));
    panel.appendChild(list);
    if (race.host) {
      var go = btn(race.players.length < 2 ? 'WAITING FOR PLAYERS' : 'START RACE (' + race.players.length + ')', 'big-btn', startRace);
      go.disabled = race.players.length < 2; if (go.disabled) go.style.opacity = '.4';
      panel.appendChild(go);
    }
    panel.appendChild(btn('LEAVE', 'linkbtn', leaveRace));
  }
  function startRace() {
    if (!race || !race.host || race.players.length < 2) return;
    var payload = { seed: 1 + Math.floor(Math.random() * 2147483000), level: race.level };
    race.ch.send({ type: 'broadcast', event: 'start', payload: payload });
    countdown(payload);
  }
  function countdown(pl) {
    race.state = 'count'; race.level = pl.level;
    var gen = SudokuEngine.generate(pl.level, SudokuEngine.mulberry32(pl.seed));   // same puzzle for everyone
    var n = 3, ctr = 3;
    function tick() {
      if (!race || race.state !== 'count') return;
      if (n === 0) { begin(); return; }
      var panel = showOv(true);
      panel.appendChild(el('div', 'line', 'GET READY'));
      var big = el('div', '', String(n)); big.style.cssText = 'font-size:96px;color:var(--amber);text-shadow:0 0 24px var(--amber)';
      panel.appendChild(big);
      n--; setTimeout(tick, 1000);
    }
    function begin() {
      level = pl.level; puzzle = gen.puzzle; solution = gen.solution; vals = puzzle.slice(); notes = new Array(81).fill(0);
      secs = 0; hints = 0; sel = -1; won = false; hist = []; notesMode = false;
      Endgame.hide();
      document.querySelector('main.cab').classList.add('racing');
      buildGrid(); render();
      race.state = 'play'; race.note = ''; race.prog = {};
      race.total = puzzle.filter(function (v) { return !v; }).length;
      raceStart = Date.now();
      hideOv(); raceBar();
    }
    tick();
  }
  function correctCount() {
    var c = 0; for (var i = 0; i < 81; i++) if (!isGiven(i) && vals[i] === solution[i]) c++; return c;
  }
  function raceProgress(force) {
    if (!race || race.state !== 'play') return;
    var now = Date.now();
    if (!force && now - lastProg < 350) { clearTimeout(race.pt); race.pt = setTimeout(function () { raceProgress(true); }, 400); return; }
    lastProg = now;
    var n = correctCount(); race.prog[race.uid] = n;
    race.ch.send({ type: 'broadcast', event: 'progress', payload: { uid: race.uid, n: n } });
    raceBar();
  }
  function raceBar() {
    var bar = $('racebar');
    if (!race || race.state !== 'play') { bar.hidden = true; return; }
    bar.hidden = false; bar.textContent = '';
    race.players.forEach(function (p) {
      var n = race.prog[p.uid] || 0, row = el('div', 'rr' + (p.uid === race.uid ? ' me' : ''));
      var label = el('span', 'rn', p.uid === race.uid ? 'YOU' : p.name);
      var meter = el('span', 'rm'); var fill = el('i'); fill.style.width = Math.min(100, Math.round(100 * n / Math.max(1, race.total))) + '%'; meter.appendChild(fill);
      row.appendChild(label); row.appendChild(meter); bar.appendChild(row);
    });
    var foot = el('div', 'rf');
    foot.appendChild(el('span', '', race.note || 'GO!'));
    foot.appendChild(btn('QUIT', 'linkbtn', function () { if (window.confirm('Quit the race?')) leaveRace(); }));
    bar.appendChild(foot);
  }
  function raceFinish() {
    if (!race || race.state !== 'play') return;
    won = true;
    var r = race, mySecs = Math.floor((Date.now() - raceStart) / 1000); secs = mySecs;
    r.state = 'done';
    var place = r.finishes.length + 1;
    r.ch.send({ type: 'broadcast', event: 'finish', payload: { uid: r.uid, name: r.name, secs: mySecs } });
    $('racebar').hidden = true;
    var line = 'RACE ' + level.toUpperCase() + ' IN ' + fmt(mySecs) + (r.finishes.length ? '. ' + r.finishes[0].name + ' WAS FIRST.' : '.');
    Endgame.show({
      key: 'sudoku-' + level, title: place === 1 ? 'YOU WON THE RACE!' : 'FINISHED #' + place, color: place === 1 ? '#7dff6b' : '#ffc83d',
      line: line, score: mySecs, delay: 300, onAgain: function () { leaveRace(); }
    });
  }
  function leaveRace() {
    dropChannel(); race = null; hideOv();
    document.querySelector('main.cab').classList.remove('racing');
    $('racebar').hidden = true;
    won = false;
    if (!load()) newGame(level === 'daily' ? 'daily' : level);
  }
  $('race').addEventListener('click', openRace);

  Auth.require().then(function (s) {
    if (!s) return;
    if (!load()) newGame('easy');
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
