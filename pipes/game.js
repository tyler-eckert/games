/* Pipe Connect: every cell holds one pipe piece. Turn pieces until water from the source reaches all of them.
   Each puzzle is a random spanning tree of the grid, so it always has a solution. N=1 E=2 S=4 W=8. */
(function () {
  'use strict';
  var N = 1, E = 2, S = 4, W = 8, DR = { 1: -1, 2: 0, 4: 1, 8: 0 }, DC = { 1: 0, 2: 1, 4: 0, 8: -1 }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  var level = 1, total = 0, cleared = 0, n, cells, src, taps, par, over, solvedLevel;
  var mode = 'relaxed', left = 0, budget = 0, gooTimer = null, waitT = null;
  function $(id) { return document.getElementById(id); }
  function rot(m) { return ((m << 1) | (m >> 3)) & 15; }
  function sizeFor(l) { return Math.min(8, 4 + Math.floor((l - 1) / 2)); }

  function makeTree(sz, l) {
    var mask = [], seen = [], front = [], k;
    for (k = 0; k < sz * sz; k++) { mask.push(0); seen.push(false); }
    var s0 = Math.floor(Math.random() * sz * sz); seen[s0] = true; front.push(s0);
    var chain = l < 3 ? 0.85 : l < 6 ? 0.5 : 0.25;   // low levels make long winding paths, later ones branch more
    while (front.length) {
      var pick = Math.random() < chain ? front.length - 1 : Math.floor(Math.random() * front.length), c = front[pick];
      var r = Math.floor(c / sz), cc = c % sz, opts = [];
      [N, E, S, W].forEach(function (d) { var rr = r + DR[d], c2 = cc + DC[d]; if (rr >= 0 && rr < sz && c2 >= 0 && c2 < sz && !seen[rr * sz + c2]) opts.push(d); });
      if (!opts.length) { front.splice(pick, 1); continue; }
      var d = opts[Math.floor(Math.random() * opts.length)], to = (r + DR[d]) * sz + cc + DC[d];
      mask[c] |= d; mask[to] |= OPP[d]; seen[to] = true; front.push(to);
    }
    return { mask: mask, src: s0 };
  }
  function glyph(m) {
    var p = '', lines = { 1: 'M50 50V4', 2: 'M50 50H96', 4: 'M50 50V96', 8: 'M50 50H4' };
    [N, E, S, W].forEach(function (d) { if (m & d) p += lines[d]; });
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pipe" d="' + p + '"/><circle class="hub" cx="50" cy="50" r="13"/></svg>';
  }
  function curMask(c) { var m = c.base; for (var k = 0; k < c.r; k++) m = rot(m); return m; }

  function litSet() {
    var lit = {}, q = [src]; lit[src] = true;
    while (q.length) {
      var c = q.shift(), r = Math.floor(c / n), cc = c % n, m = curMask(cells[c]);
      [N, E, S, W].forEach(function (d) {
        if (!(m & d)) return;
        var rr = r + DR[d], c2 = cc + DC[d];
        if (rr < 0 || rr >= n || c2 < 0 || c2 >= n) return;
        var to = rr * n + c2;
        if (!lit[to] && (curMask(cells[to]) & OPP[d])) { lit[to] = true; q.push(to); }
      });
    }
    return lit;
  }
  function paint() {
    var lit = litSet(), count = 0;
    cells.forEach(function (c, k) { var on = !!lit[k]; if (on) count++; c.el.classList.toggle('lit', on); });
    $('tp').textContent = 'TAPS ' + taps;
    return count === n * n;
  }

  function newLevel() {
    n = sizeFor(level); over = false; solvedLevel = false; taps = 0; par = 0;
    var t, ok = false, rots;
    while (!ok) {
      t = makeTree(n, level); cells = []; par = 0;
      for (var k = 0; k < n * n; k++) {
        var r = Math.floor(Math.random() * 4), m = t.mask[k], base = m, i;
        for (i = 0; i < r; i++) base = rot(base);   // scrambled start: rotating `base` by (4-r) mod 4 gives m again
        // base is the start shape; solved shape reachable by turning it need = min x with rot^x(base) == m
        var need = 0, tmp = base; while (tmp !== m && need < 4) { tmp = rot(tmp); need++; }
        par += need; cells.push({ base: base, r: 0, deg: 0, need: need });
      }
      src = t.src; ok = !paint2();
    }
    var b = $('board'); b.textContent = ''; b.className = 'pp-board'; b.style.gridTemplateColumns = 'repeat(' + n + ',minmax(0,1fr))'; b.style.gridTemplateRows = 'repeat(' + n + ',minmax(0,1fr))';
    cells.forEach(function (c, k) {
      var el = document.createElement('button'); el.type = 'button'; el.className = 'pp-c' + (k === src ? ' src' : '');
      el.setAttribute('aria-label', 'Pipe row ' + (Math.floor(k / n) + 1) + ' column ' + (k % n + 1) + (k === src ? ', water source' : ''));
      var inn = document.createElement('div'); inn.className = 'in'; inn.innerHTML = glyph(c.base); el.appendChild(inn);
      c.el = el; c.inn = inn; el.addEventListener('click', function () { turn(k); }); b.appendChild(el);
    });
    $('lvl').textContent = 'LEVEL ' + level; $('next').hidden = true; $('btns').hidden = false;
    $('fresh').hidden = mode === 'race'; armGoo();
    $('msg').textContent = level === 1 ? 'TURN THE PIPES SO WATER REACHES EVERY ONE.' : 'GET WATER TO EVERY PIPE.';
    paint();
  }
  function paint2() {   // used while generating: is the scramble already solved?
    var save = cells.map(function (c) { return c.el; }), lit = litSet(), count = 0;
    for (var k in lit) count++;
    return count === n * n;
  }
  /* race mode: a tank of ooze drains after a short head start. If it runs dry before every pipe is wet, the ooze gets out. */
  function stopGoo() { clearInterval(gooTimer); clearTimeout(waitT); gooTimer = null; waitT = null; }
  function fmtT(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function armGoo() {
    stopGoo();
    var goo = $('goo'); goo.hidden = mode !== 'race'; goo.className = 'goo';
    if (mode !== 'race') return;
    var shrink = Math.max(0.6, 1 - 0.04 * (level - 1));
    budget = Math.round((par * 0.75 + n * n * 0.6 + 8) * shrink); left = budget;
    $('gf').style.width = '100%';
    var wait = 4;
    goo.classList.add('wait'); $('gt').textContent = 'OOZE STARTS IN ' + wait;
    $('msg').textContent = 'GET READY. THE OOZE STARTS SOON.';
    (function countdown() {
      waitT = setTimeout(function () {
        wait--;
        if (over) return;
        if (wait > 0) { $('gt').textContent = 'OOZE STARTS IN ' + wait; countdown(); return; }
        goo.classList.remove('wait'); $('msg').textContent = 'SOLVE IT BEFORE THE OOZE RUNS OUT!';
        var last = Date.now();
        gooTimer = setInterval(function () {
          var now = Date.now(), dt = Math.min(now - last, 250); last = now;
          if (over) return;
          left -= dt / 1000;
          $('gf').style.width = Math.max(0, left / budget * 100) + '%';
          $('gt').textContent = 'OOZE ' + fmtT(left);
          goo.classList.toggle('low', left <= budget * 0.25);
          if (left <= 0) lose();
        }, 100);
      }, 1000);
    })();
  }
  function lose() {
    over = true; stopGoo();
    $('board').classList.add('gooed'); $('goo').classList.remove('low'); $('gt').textContent = 'THE OOZE GOT OUT!';
    $('msg').textContent = 'OUT OF TIME ON LEVEL ' + level + '.';
    $('btns').hidden = true;
    setTimeout(function () {
      Endgame.show({ key: 'pipes-race', title: 'THE OOZE GOT OUT!', color: '#ff7b8a', line: 'CLEARED ' + cleared + (cleared === 1 ? ' LEVEL' : ' LEVELS'), score: total, delay: 300, onAgain: showSetup });
    }, 900);
  }
  function showSetup() { over = true; stopGoo(); $('game').hidden = true; $('setup').hidden = false; }
  function turn(k) {
    if (over) return;
    var c = cells[k]; c.r = (c.r + 1) % 4; c.deg += 90; taps++;
    c.inn.style.transform = 'rotate(' + c.deg + 'deg)';
    if (paint()) win();
  }
  function win() {
    over = true; solvedLevel = true; cleared++; stopGoo();
    var pts = Math.max(10, n * n * 10 - Math.max(0, taps - par) * 3), bonus = mode === 'race' ? Math.round(Math.max(0, left) * 5) : 0; pts += bonus; total += pts;
    if (mode === 'race') $('goo').classList.remove('low');
    $('board').classList.add('done');
    $('msg').textContent = 'WATER REACHES EVERYTHING! +' + pts + (bonus ? ' (INCLUDES ' + bonus + ' TIME BONUS)' : '');
    $('btns').hidden = true; $('next').hidden = false; $('next').focus();
  }
  function finish() {
    over = true; stopGoo();
    if (!cleared) { level = 1; total = 0; newLevel(); return; }
    Endgame.show({ key: mode === 'race' ? 'pipes-race' : 'pipes', title: 'NICE PLUMBING!', color: '#3ef0ff', line: 'CLEARED ' + cleared + (cleared === 1 ? ' LEVEL' : ' LEVELS'), score: total, delay: 300,
      onAgain: showSetup });
  }
  $('next').addEventListener('click', function () { level++; newLevel(); });
  $('fresh').addEventListener('click', function () { if (!over) newLevel(); });
  $('finish').addEventListener('click', finish);
  $('help').addEventListener('click', function () {
    HowTo.show({ title: 'HOW TO PLAY PIPE CONNECT', steps: [
      'Tap a pipe to turn it a quarter turn. The glowing gold piece is the water source.',
      'Pipes that water can reach glow blue. Connect them all and the puzzle is solved.',
      'Every puzzle has a solution. If one feels tangled, tap NEW PUZZLE for a fresh grid at the same size.',
      'Each level adds points. Fewer extra taps earns more. The grid gets bigger and trickier as you go.',
      'In RACE THE OOZE, a tank of ooze drains after a short head start. Wet every pipe before it runs out. Faster solves earn a time bonus, and the tank is smaller on later levels.',
      'Tap FINISH to bank your points on the leaderboard. Relaxed and Race have separate leaderboards.'
    ] });
  });
  function seg(id, key) {
    var s = $(id);
    Array.prototype.forEach.call(s.children, function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.n; Array.prototype.forEach.call(s.children, function (x) { x.classList.toggle('on', x === b); });
        $('modenote').textContent = mode === 'race' ? 'A TANK OF OOZE DRAINS AFTER A SHORT HEAD START. WET EVERY PIPE BEFORE IT RUNS DRY. FASTER SOLVES EARN A TIME BONUS.' : 'NO CLOCK. TURN PIPES AT YOUR OWN PACE.';
      });
    });
  }
  seg('mode');
  $('start').addEventListener('click', function () { level = 1; total = 0; cleared = 0; $('setup').hidden = true; $('game').hidden = false; newLevel(); });
  Auth.require();
})();
