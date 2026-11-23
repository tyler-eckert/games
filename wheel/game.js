(function () {
  var GAME = 'wheel', PER_GAME = 3, MISS_LIMIT = 5, VOWEL_COST = 250, ROW_W = 12, MAX_ROWS = 4, BONUS = 250;
  var VOWELS = 'AEIOU', TAU = Math.PI * 2;
  var PALETTE = [
    { c: '#ff4d5e', t: '#0b0a1f' }, { c: '#ffc83d', t: '#0b0a1f' }, { c: '#7dff6b', t: '#0b0a1f' },
    { c: '#3ef0ff', t: '#0b0a1f' }, { c: '#4d6bff', t: '#ffffff' }, { c: '#e86bff', t: '#0b0a1f' }
  ];
  var LIST = [500, 'B', 600, 300, 700, 'B', 800, 200, 900, 450, 350, 1000, 250, 2500, 150, 400];
  var WEDGES = LIST.map(function (v, i) {
    return v === 'B'
      ? { b: true, v: 0, t: 'BANKRUPT', c: '#07061a', tc: '#ff7be8' }
      : { b: false, v: v, t: String(v), c: PALETTE[i % 6].c, tc: PALETTE[i % 6].t };
  });
  var N = WEDGES.length, A = TAU / N;

  var $ = function (id) { return document.getElementById(id); };
  var wheel = $('wheel'), wx = wheel.getContext('2d');
  var dpr = window.devicePixelRatio || 1, SIZE = 196;

  var token = 0, puzzleNo, total, solvedCount, round, misses, phrase, cat, letters, used, hot, reveal;
  var state = 'idle', wedgeVal = 0, rot = 0, pool = [];

  /* ---------- puzzle helpers ---------- */
  function layout(text) {
    var words = text.split(' '), rows = [], cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= ROW_W) cur += ' ' + w;
      else { rows.push(cur); cur = w; }
    });
    if (cur) rows.push(cur);
    return rows;
  }
  function pick() {
    var tries = 0, idx;
    do {
      idx = Math.floor(Math.random() * WHEEL_PUZZLES.length);
      tries++;
    } while ((pool.indexOf(idx) > -1 || layout(WHEEL_PUZZLES[idx][1]).length > MAX_ROWS) && tries < 200);
    pool.push(idx);
    return WHEEL_PUZZLES[idx];
  }
  function isLetter(ch) { return ch >= 'A' && ch <= 'Z'; }
  function allRevealed() {
    for (var i = 0; i < phrase.length; i++) if (isLetter(phrase[i]) && !letters[phrase[i]]) return false;
    return true;
  }
  function countIn(L) {
    var n = 0;
    for (var i = 0; i < phrase.length; i++) if (phrase[i] === L) n++;
    return n;
  }
  function money(n) { return '$' + n.toLocaleString(); }

  /* ---------- flow ---------- */
  function newGame() {
    if (window.Auth && Auth.play) Auth.play('wheel');
    token++;
    pool = []; puzzleNo = 1; total = 0; solvedCount = 0;
    Endgame.hide();
    startPuzzle();
  }
  function startPuzzle() {
    var p = pick();
    cat = p[0]; phrase = p[1];
    round = 0; misses = 0; letters = {}; used = {}; hot = {}; reveal = null;
    state = 'idle';
    setMsg('SPIN THE WHEEL!');
    showActs();
    render();
  }
  function setMsg(t) { $('msg').textContent = t; }

  function spin() {
    if (state !== 'idle') return;
    state = 'spin'; hot = {}; render();
    var my = token;
    var k = Math.floor(Math.random() * N);
    var jitter = (Math.random() - 0.5) * A * 0.7;
    var target = -Math.PI / 2 - (k + 0.5) * A + jitter;
    var delta = (((target - rot) % TAU) + TAU) % TAU + (4 + Math.floor(Math.random() * 3)) * TAU;
    var from = rot, t0 = null, dur = 3400;
    setMsg('SPINNING...');
    function step(ts) {
      if (my !== token) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      rot = from + delta * e;
      drawWheel();
      if (p < 1) requestAnimationFrame(step); else landed();
    }
    requestAnimationFrame(step);
  }
  function wedgeAt(r) {
    var ang = (((-Math.PI / 2 - r) % TAU) + TAU) % TAU;
    return Math.floor(ang / A) % N;
  }
  function landed() {
    var w = WEDGES[wedgeAt(rot)];
    if (w.b) {
      round = 0; state = 'idle';
      setMsg('BANKRUPT! YOUR CASH FOR THIS PUZZLE IS GONE.');
    } else {
      wedgeVal = w.v; state = 'consonant';
      setMsg(money(w.v) + ' A LETTER. PICK A CONSONANT.');
    }
    render();
  }

  function guess(L) {
    var isV = VOWELS.indexOf(L) > -1;
    if (used[L]) return;
    var wasCons = state === 'consonant';
    if (wasCons && !isV) { /* ok */ }
    else if (state === 'vowel' && isV) round -= VOWEL_COST;
    else return;
    used[L] = true;
    var n = countIn(L);
    if (n > 0) {
      letters[L] = true; hot = {}; hot[L] = true;
      var earn = wasCons ? n * wedgeVal : 0;
      round += earn;
      setMsg(n + ' x ' + L + (wasCons ? ' = ' + money(earn) : '. NICE!'));
      if (allRevealed()) { solved(); return; }
      state = 'idle';
    } else {
      misses++; hot = {};
      setMsg('NO ' + L + ' IN THE PUZZLE.');
      if (misses >= MISS_LIMIT) { fail(); return; }
      state = 'idle';
    }
    render();
  }
  function toggleVowel() {
    if (state === 'vowel') { state = 'idle'; setMsg('SPIN, BUY A VOWEL, OR SOLVE.'); }
    else if (state === 'idle' && canBuyVowel()) { state = 'vowel'; setMsg('PICK A VOWEL. IT COSTS ' + money(VOWEL_COST) + '.'); }
    render();
  }
  function canBuyVowel() {
    return round >= VOWEL_COST && VOWELS.split('').some(function (v) { return !used[v]; });
  }

  function openSolve() {
    if (state !== 'idle') return;
    state = 'solve'; hot = {};
    $('acts').hidden = true; $('solveForm').hidden = false;
    $('guess').value = ''; $('guess').focus();
    setMsg('TYPE THE WHOLE PHRASE.');
    render();
  }
  function showActs() { $('acts').hidden = false; $('solveForm').hidden = true; }
  function closeSolve() {
    if (state === 'solve') { state = 'idle'; setMsg('SPIN, BUY A VOWEL, OR SOLVE.'); }
    showActs(); render();
  }
  function submitSolve(e) {
    e.preventDefault();
    if (state !== 'solve') return;
    var a = $('guess').value.toUpperCase().replace(/[^A-Z]/g, '');
    var b = phrase.replace(/[^A-Z]/g, '');
    showActs();
    if (a === b) { solved(); return; }
    misses++; state = 'idle';
    setMsg('NOT QUITE!');
    if (misses >= MISS_LIMIT) { fail(); return; }
    render();
  }

  function solved() {
    state = 'between'; reveal = 'win';
    solvedCount++;
    var gain = Math.max(0, round) + BONUS;
    total += gain;
    setMsg('SOLVED! ' + money(Math.max(0, round)) + ' + ' + money(BONUS) + ' BONUS');
    render();
    advance(2400);
  }
  function fail() {
    state = 'between'; reveal = 'lose';
    setMsg('OUT OF GUESSES. HERE IS THE ANSWER.');
    render();
    advance(3000);
  }
  function advance(ms) {
    var my = token;
    setTimeout(function () {
      if (my !== token) return;
      if (puzzleNo >= PER_GAME) finish();
      else { puzzleNo++; startPuzzle(); }
    }, ms);
  }
  function finish() {
    state = 'over';
    Endgame.show({
      key: GAME, title: 'GAME COMPLETE', color: '#7dff6b',
      line: solvedCount + ' OF ' + PER_GAME + ' PUZZLES SOLVED',
      score: total, delay: 200, onAgain: newGame
    });
  }

  /* ---------- rendering ---------- */
  function renderBoard() {
    var b = $('board');
    b.textContent = '';
    layout(phrase).forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'brow';
      for (var i = 0; i < row.length; i++) {
        var ch = row[i], t = document.createElement('div');
        if (ch === ' ') { t.className = 'gap'; }
        else if (!isLetter(ch)) { t.className = 'tile punc'; t.textContent = ch; }
        else {
          var shown = letters[ch] || reveal === 'win' || reveal === 'lose';
          t.className = 'tile' + (shown ? ' on' : '') + (hot[ch] ? ' hot' : '') + (reveal === 'lose' && !letters[ch] ? ' miss' : '');
          if (shown) t.textContent = ch;
        }
        r.appendChild(t);
      }
      b.appendChild(r);
    });
    var txt = layout(phrase).join(' ');
    b.setAttribute('aria-label', 'Puzzle: ' + txt.split('').map(function (ch) {
      return !isLetter(ch) ? ch : (letters[ch] || reveal ? ch : 'blank');
    }).join(' '));
  }
  function buildKeys() {
    var k = $('keys');
    k.textContent = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.l = L; b.textContent = L;
      if (VOWELS.indexOf(L) > -1) b.className = 'v';
      b.setAttribute('aria-label', 'Letter ' + L + (VOWELS.indexOf(L) > -1 ? ', vowel' : ''));
      k.appendChild(b);
    });
  }
  function render() {
    $('cat').textContent = cat;
    renderBoard();
    $('round').textContent = 'ROUND ' + money(Math.max(0, round));
    $('lives').textContent = 'MISSES ' + misses + '/' + MISS_LIMIT;
    $('pz').textContent = 'PUZZLE ' + puzzleNo + '/' + PER_GAME;
    $('total').textContent = money(total);
    Array.prototype.forEach.call($('keys').children, function (b) {
      var L = b.dataset.l, isV = VOWELS.indexOf(L) > -1;
      var ok = !used[L] && ((state === 'consonant' && !isV) || (state === 'vowel' && isV));
      b.disabled = !ok;
      b.classList.toggle('hit', !!letters[L]);
    });
    $('spin').disabled = state !== 'idle';
    $('vowel').disabled = !(state === 'vowel' || (state === 'idle' && canBuyVowel()));
    $('vowel').textContent = state === 'vowel' ? 'CANCEL' : 'BUY VOWEL $' + VOWEL_COST;
    $('solve').disabled = state !== 'idle';
    drawWheel();
  }
  function drawWheel() {
    var R = SIZE / 2 - 8, c = SIZE / 2, i;
    wx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wx.clearRect(0, 0, SIZE, SIZE);
    wx.save();
    wx.translate(c, c + 4);
    wx.rotate(rot);
    for (i = 0; i < N; i++) {
      var w = WEDGES[i];
      wx.beginPath(); wx.moveTo(0, 0); wx.arc(0, 0, R, i * A, (i + 1) * A); wx.closePath();
      wx.fillStyle = w.c; wx.fill();
      wx.lineWidth = 1.5; wx.strokeStyle = '#0b0a1f'; wx.stroke();
      wx.save();
      wx.rotate(i * A + A / 2);
      wx.fillStyle = w.tc; wx.textAlign = 'right'; wx.textBaseline = 'middle';
      wx.font = 'bold ' + (w.b ? 9 : 12) + 'px ui-sans-serif, system-ui, sans-serif';
      wx.fillText(w.t, R - 8, 0);
      wx.restore();
    }
    wx.beginPath(); wx.arc(0, 0, R, 0, TAU); wx.lineWidth = 4; wx.strokeStyle = '#c9c8f5'; wx.stroke();
    wx.restore();
    wx.beginPath(); wx.arc(c, c + 4, 12, 0, TAU); wx.fillStyle = '#14123a'; wx.fill();
    wx.lineWidth = 3; wx.strokeStyle = '#ffc83d'; wx.stroke();
    wx.beginPath(); wx.moveTo(c - 10, 2); wx.lineTo(c + 10, 2); wx.lineTo(c, 22); wx.closePath();
    wx.fillStyle = '#ffc83d'; wx.fill(); wx.strokeStyle = '#0b0a1f'; wx.lineWidth = 2; wx.stroke();
  }
  function sizeWheel() {
    wheel.style.width = SIZE + 'px'; wheel.style.height = SIZE + 'px';
    wheel.width = Math.round(SIZE * dpr); wheel.height = Math.round(SIZE * dpr);
  }

  /* ---------- input ---------- */
  $('keys').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-l]');
    if (b && !b.disabled) guess(b.dataset.l);
  });
  $('spin').addEventListener('click', spin);
  $('vowel').addEventListener('click', toggleVowel);
  $('solve').addEventListener('click', openSolve);
  $('cancelSolve').addEventListener('click', closeSolve);
  $('solveForm').addEventListener('submit', submitSolve);
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || HowTo.isOpen() || Endgame.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    var L = e.key.length === 1 ? e.key.toUpperCase() : '';
    if (L >= 'A' && L <= 'Z') guess(L);
  });

  var HELP = [
    'Each puzzle is a hidden phrase. The category is shown above the board.',
    'Press SPIN, then pick a consonant. Every match earns the amount on the wedge. BANKRUPT wipes out your cash for that puzzle.',
    'BUY VOWEL costs $250 of your puzzle cash. SOLVE lets you type the whole phrase when you think you know it.',
    'Five wrong guesses and the puzzle is lost. Solve all 3 puzzles to build your total. You can also type letters on a keyboard.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  buildKeys();
  sizeWheel();
  Auth.require().then(function (s) {
    if (!s) return;
    newGame();
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
