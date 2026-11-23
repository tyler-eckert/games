(function () {
  var LEVELS = {
    easy:   { rows: 9,  cols: 9, mines: 10, base: 1000, label: 'EASY' },
    medium: { rows: 12, cols: 9, mines: 20, base: 2000, label: 'MEDIUM' },
    hard:   { rows: 16, cols: 9, mines: 35, base: 3000, label: 'HARD' }
  };
  var NUM_COLORS = ['', '#3ef0ff', '#7dff6b', '#ff7b8a', '#8fa2ff', '#ffc83d', '#5ef0c0', '#ffffff', '#c9c8f5'];
  var MINE_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5" fill="#ff7be8"/><g stroke="#ff7be8" stroke-width="2"><line x1="10" y1="1" x2="10" y2="19"/><line x1="1" y1="10" x2="19" y2="10"/><line x1="3.5" y1="3.5" x2="16.5" y2="16.5"/><line x1="16.5" y1="3.5" x2="3.5" y2="16.5"/></g></svg>';
  var FLAG_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><line x1="6" y1="2" x2="6" y2="18" stroke="#e9e8ff" stroke-width="2"/><polygon points="6,2 17,6.5 6,11" fill="#ffc83d"/></svg>';

  var level = 'easy', cfg, cells, state, secs, timer, flagMode = false, flagsLeft, openCount, lastScore, scoreSaved = false, focusIdx = 0, press = null;
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid');

  function gameKey() { return 'minesweeper-' + level; }
  function idx(r, c) { return r * cfg.cols + c; }
  function neighbors(i) {
    var r = Math.floor(i / cfg.cols), c = i % cfg.cols, out = [];
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      var nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols) out.push(idx(nr, nc));
    }
    return out;
  }

  function hud() {
    $('time').textContent = 'T ' + String(Math.min(secs, 999)).padStart(3, '0');
    $('left').textContent = 'M ' + flagsLeft;
  }
  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () { secs++; hud(); }, 1000);
  }

  function label(c, i) {
    var pos = 'Row ' + (Math.floor(i / cfg.cols) + 1) + ' column ' + (i % cfg.cols + 1) + ', ';
    if (c.open) return pos + (c.mine ? 'mine' : c.adj ? c.adj + ' nearby' : 'empty');
    return pos + (c.flag ? 'flagged' : 'hidden');
  }
  function paint(i, extraClass) {
    var c = cells[i], b = c.el;
    b.className = 'cell' + (c.open ? ' open' : '') + (extraClass ? ' ' + extraClass : '');
    b.innerHTML = '';
    b.style.color = '';
    if (c.open && c.mine) b.innerHTML = MINE_SVG;
    else if (c.open && c.adj > 0) { b.textContent = c.adj; b.style.color = NUM_COLORS[c.adj]; }
    else if (!c.open && c.flag) b.innerHTML = FLAG_SVG;
    b.setAttribute('aria-label', label(c, i));
  }

  function newGame() {
    cfg = LEVELS[level];
    if (window.Auth && Auth.play) Auth.play(gameKey());
    stopTimer();
    secs = 0; flagsLeft = cfg.mines; openCount = 0; state = 'ready';
    grid.textContent = '';
    grid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', var(--cs))';
    cells = [];
    for (var i = 0; i < cfg.rows * cfg.cols; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.i = i;
      b.setAttribute('role', 'gridcell');
      b.tabIndex = i === 0 ? 0 : -1;
      grid.appendChild(b);
      cells.push({ mine: false, adj: 0, open: false, flag: false, el: b });
      paint(i);
    }
    focusIdx = 0;
    $('over').hidden = true;
    $('ini').value = '';
    hud();
  }

  function placeMines(safe) {
    var banned = {}; banned[safe] = 1;
    neighbors(safe).forEach(function (n) { banned[n] = 1; });
    var pool = [];
    for (var i = 0; i < cells.length; i++) if (!banned[i]) pool.push(i);
    for (var k = pool.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1)), t = pool[k]; pool[k] = pool[j]; pool[j] = t;
    }
    pool.slice(0, cfg.mines).forEach(function (m) { cells[m].mine = true; });
    cells.forEach(function (c, i) {
      c.adj = neighbors(i).filter(function (n) { return cells[n].mine; }).length;
    });
  }

  function reveal(i) {
    var c = cells[i];
    if (state === 'won' || state === 'lost' || c.open || c.flag) return;
    if (state === 'ready') { placeMines(i); state = 'play'; startTimer(); }
    if (c.mine) { lose(i); return; }
    var stack = [i];
    while (stack.length) {
      var k = stack.pop(), ck = cells[k];
      if (ck.open || ck.flag) continue;
      ck.open = true; openCount++;
      paint(k);
      if (ck.adj === 0) neighbors(k).forEach(function (n) { if (!cells[n].open && !cells[n].flag) stack.push(n); });
    }
    if (openCount === cells.length - cfg.mines) win();
  }

  function toggleFlag(i) {
    var c = cells[i];
    if (state === 'won' || state === 'lost' || c.open) return;
    if (!c.flag && flagsLeft <= 0) return;
    c.flag = !c.flag;
    flagsLeft += c.flag ? -1 : 1;
    paint(i); hud();
  }

  function chord(i) {
    var c = cells[i];
    if (!c.open || c.adj < 1) return;
    var ns = neighbors(i);
    var flags = ns.filter(function (n) { return cells[n].flag; }).length;
    if (flags !== c.adj) return;
    ns.forEach(function (n) { if (state === 'play') reveal(n); });
  }

  function primary(i) {
    if (flagMode) toggleFlag(i);
    else if (cells[i].open) chord(i);
    else reveal(i);
  }
  function secondary(i) {
    if (flagMode) { if (cells[i].open) chord(i); else reveal(i); }
    else toggleFlag(i);
  }

  function win() {
    state = 'won'; stopTimer();
    cells.forEach(function (c, i) { if (c.mine && !c.flag) { c.flag = true; paint(i); } });
    flagsLeft = 0; hud();
    lastScore = Math.max(100, cfg.base - secs * 5);
    showOver(true);
  }
  function lose(hit) {
    state = 'lost'; stopTimer();
    cells.forEach(function (c, i) {
      if (c.mine && !c.flag) { c.open = true; paint(i, i === hit ? 'boom' : ''); }
      else if (!c.mine && c.flag) { paint(i, 'wrong'); }
    });
    lastScore = 0;
    showOver(false);
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function renderTable() {
    var t = $('table');
    Scores.top(gameKey(), 5).then(function (list) {
      t.textContent = '';
      if (!list.length) { t.hidden = true; return; }
      list.forEach(function (s, i) {
        var d = el('div');
        d.appendChild(el('span', '', (i + 1) + '. ' + s.initials));
        d.appendChild(el('span', '', s.score.toLocaleString()));
        t.appendChild(d);
      });
      t.hidden = false;
    });
  }
  function showOver(won) {
    var title = $('over-title');
    title.textContent = won ? 'FIELD CLEARED!' : 'BOOM!';
    title.style.color = won ? '#7dff6b' : '#ff7b8a';
    title.style.textShadow = '0 0 14px ' + (won ? '#7dff6b' : '#ff7b8a');
    $('over-line').textContent = won ? cfg.label + ' CLEARED IN ' + secs + ' SEC' : 'YOU HIT A MINE';
    $('over-score').textContent = 'SCORE ' + lastScore.toLocaleString();
    scoreSaved = false;
    var q = won && lastScore > 0 && Scores.qualifies(gameKey(), lastScore);
    $('initials').hidden = !q;
    $('again').hidden = q;
    $('table').hidden = true;
    if (!q) renderTable();
    // brief pause so a lost game's board is visible before the dialog
    setTimeout(function () {
      if (state !== 'won' && state !== 'lost') return;
      $('over').hidden = false;
      (q ? $('ini') : $('again')).focus();
    }, won ? 200 : 900);
  }

  /* ---- input ---- */
  function cellOf(e) { var b = e.target.closest ? e.target.closest('.cell') : null; return b ? +b.dataset.i : -1; }
  grid.addEventListener('pointerdown', function (e) {
    var i = cellOf(e);
    if (i < 0) return;
    if (e.button === 2) { toggleFlag(i); return; }
    if (e.button > 0) return;
    var p = { i: i, fired: false };
    p.t = setTimeout(function () {
      p.fired = true;
      secondary(i);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 450);
    press = p;
  });
  function endPress(commit, e) {
    if (!press) return;
    var p = press; press = null;
    clearTimeout(p.t);
    if (!commit || p.fired) return;
    if (e && cellOf(e) !== p.i) return;
    primary(p.i);
  }
  grid.addEventListener('pointerup', function (e) { endPress(true, e); });
  grid.addEventListener('pointerleave', function () { endPress(false); });
  grid.addEventListener('pointercancel', function () { endPress(false); });
  grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  // Keyboard activation (Enter/Space fire click with detail 0)
  grid.addEventListener('click', function (e) {
    if (e.detail !== 0) return;
    var i = cellOf(e);
    if (i >= 0) primary(i);
  });
  grid.addEventListener('focusin', function (e) {
    var i = cellOf(e);
    if (i < 0) return;
    cells[focusIdx].el.tabIndex = -1;
    focusIdx = i; cells[i].el.tabIndex = 0;
  });
  grid.addEventListener('keydown', function (e) {
    var i = cellOf(e);
    if (i < 0) return;
    var r = Math.floor(i / cfg.cols), c = i % cfg.cols, to = -1;
    if (e.key === 'ArrowUp' && r > 0) to = idx(r - 1, c);
    else if (e.key === 'ArrowDown' && r < cfg.rows - 1) to = idx(r + 1, c);
    else if (e.key === 'ArrowLeft' && c > 0) to = idx(r, c - 1);
    else if (e.key === 'ArrowRight' && c < cfg.cols - 1) to = idx(r, c + 1);
    else if (e.key === 'f' || e.key === 'F') { toggleFlag(i); return; }
    if (to >= 0) { e.preventDefault(); cells[to].el.focus(); }
  });

  $('mode').addEventListener('click', function () {
    flagMode = !flagMode;
    this.textContent = 'MODE: ' + (flagMode ? 'FLAG' : 'DIG');
    this.setAttribute('aria-pressed', flagMode ? 'true' : 'false');
  });
  $('new').addEventListener('click', newGame);
  $('again').addEventListener('click', newGame);
  $('levels').addEventListener('click', function (e) {
    var b = e.target.closest('.lv');
    if (!b) return;
    level = b.dataset.lv;
    Array.prototype.forEach.call(this.querySelectorAll('.lv'), function (x) { x.classList.toggle('on', x === b); });
    newGame();
  });
  $('initials').addEventListener('submit', function (e) {
    e.preventDefault();
    var ini = $('ini').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!ini || scoreSaved || !(lastScore > 0)) return;
    scoreSaved = true;                       // one save per game, even on repeated taps
    $('initials').hidden = true;
    $('again').hidden = false;
    Scores.submit(gameKey(), ini, lastScore).then(function () {
      renderTable();
      $('again').focus();
    });
  });

  var HELP = {
    title: 'HOW TO PLAY',
    steps: [
      'Each number tells you how many mines touch that square, counting diagonals.',
      'Tap a square to dig. Press and hold (or right-click) to plant a flag where you think a mine is. MODE swaps the two.',
      'Tap a number once you have flagged all of its mines to dig the squares around it.',
      'Your first dig is always safe. Clear every safe square to win. Faster clears score higher.'
    ],
    button: 'START'
  };
  $('help').addEventListener('click', function () { HowTo.show({ title: 'HOW TO PLAY', steps: HELP.steps, button: 'GOT IT' }); });

  Auth.require().then(function (s) {
    if (!s) return;
    newGame();
    HowTo.show(HELP);
  });
})();
