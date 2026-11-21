(function () {
  var SAVE = 'arcade.sudoku.save', ERR_KEY = 'arcade.sudoku.errors';
  var BASE = { easy: 1000, medium: 2000, hard: 3000, daily: 2000 };
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $('grid'), numsEl = $('nums');

  var level = 'easy', puzzle, solution, vals, notes, secs = 0, hints = 0, sel = -1;
  var notesMode = false, showErrors = true, won = false, hist = [], cells = [], timer = null;

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
    render(); save(); checkWin();
  }
  function erase() {
    if (won || sel < 0 || isGiven(sel) || (!vals[sel] && !notes[sel])) return;
    hist.push({ i: sel, v: vals[sel], n: notes[sel] });
    vals[sel] = 0; notes[sel] = 0;
    render(); save();
  }
  function undo() {
    if (won || !hist.length) return;
    var h = hist.pop();
    if (h.batch) h.batch.forEach(function (b) { vals[b.i] = b.v; notes[b.i] = b.n; });
    else { vals[h.i] = h.v; notes[h.i] = h.n; }
    render(); save();
  }
  function hint() {
    if (won) return;
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
    won = true;
    clearInterval(timer); timer = null;
    save();
    var score = Math.max(100, BASE[level] - secs * 2 - hints * 150);
    Endgame.show({
      key: 'sudoku-' + level, title: 'SOLVED!', color: '#7dff6b',
      line: level.toUpperCase() + ' IN ' + fmt(secs) + (hints ? ' / ' + hints + (hints === 1 ? ' HINT' : ' HINTS') : ''),
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
    if (!won && progress() && !window.confirm('Start a new ' + level + ' puzzle?')) return;
    newGame(level);
  });
  $('levels').addEventListener('click', function (e) {
    var b = e.target.closest('.lv');
    if (!b || b.dataset.lv === level) return;
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
    'Stuck? HINT fills in one square, but costs points. DAILY gives everyone the same puzzle today. Your game is saved if you leave.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  setInterval(function () {
    if (won || document.hidden || HowTo.isOpen() || !vals) return;
    secs++;
    $('time').textContent = fmt(secs);
    if (secs % 5 === 0) save();
  }, 1000);

  Auth.require().then(function (s) {
    if (!s) return;
    if (!load()) newGame('easy');
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
