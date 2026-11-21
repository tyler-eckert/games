(function () {
  var SAVE = 'arcade.solitaire.save';
  var SUITS = ['♠︎', '♥︎', '♦︎', '♣︎'];
  var SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var RANK_NAMES = ['', 'ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
  var GAP = 5;

  var $ = function (id) { return document.getElementById(id); };
  var solEl = $('sol');
  var g, hist = [], sel = null, won = false, timer = null, busy = false;

  /* ---------- state helpers ---------- */
  function red(s) { return s === 1 || s === 2; }
  function pileArr(p) {
    if (p === 's') return g.stock;
    if (p === 'w') return g.waste;
    return p.charAt(0) === 'f' ? g.f[+p.charAt(1)] : g.t[+p.charAt(1)];
  }
  function okTab(card, arr) {
    if (!arr.length) return card.r === 13;
    var top = arr[arr.length - 1];
    return top.up && red(top.s) !== red(card.s) && top.r === card.r + 1;
  }
  function okFound(card, arr) {
    if (!arr.length) return card.r === 1;
    var top = arr[arr.length - 1];
    return top.s === card.s && top.r + 1 === card.r;
  }
  function canMove(s, to) {
    if (s.pile === to) return false;
    var src = pileArr(s.pile), card = src[s.idx];
    if (!card || !card.up) return false;
    var n = src.length - s.idx, dst = pileArr(to);
    if (to.charAt(0) === 'f') return n === 1 && okFound(card, dst);
    if (to.charAt(0) === 't') return okTab(card, dst);
    return false;
  }
  function fmt(secs) {
    var m = Math.floor(secs / 60), s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- timer / save ---------- */
  function stopTimer() { clearInterval(timer); timer = null; }
  function ensureTimer() {
    if (timer || won) return;
    timer = setInterval(function () { g.secs++; updateStat(); if (g.secs % 5 === 0) save(); }, 1000);
  }
  function updateStat() { $('stat').textContent = g.score + ' · ' + fmt(g.secs); }
  function save() {
    try { if (won) localStorage.removeItem(SAVE); else localStorage.setItem(SAVE, JSON.stringify(g)); } catch (e) {}
  }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(SAVE));
      if (!o || !Array.isArray(o.stock) || !Array.isArray(o.waste) || o.f.length !== 4 || o.t.length !== 7) return false;
      var total = o.stock.length + o.waste.length + o.f.concat(o.t).reduce(function (a, p) { return a + p.length; }, 0);
      if (total !== 52) return false;
      g = o;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- game flow ---------- */
  function deal(draw) {
    var deck = [], s, r, i, j;
    for (s = 0; s < 4; s++) for (r = 1; r <= 13; r++) deck.push({ s: s, r: r, up: false });
    for (i = deck.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    var t = [[], [], [], [], [], [], []];
    for (i = 0; i < 7; i++) for (j = 0; j <= i; j++) {
      var c = deck.pop(); c.up = (j === i); t[i].push(c);
    }
    g = { stock: deck, waste: [], f: [[], [], [], []], t: t, draw: draw, score: 0, moves: 0, secs: 0 };
    hist = []; sel = null; won = false; busy = false;
    stopTimer();
    Endgame.hide();
    render(); save();
  }
  function snapshot() {
    hist.push(JSON.stringify({ stock: g.stock, waste: g.waste, f: g.f, t: g.t, score: g.score, moves: g.moves }));
    if (hist.length > 400) hist.shift();
  }
  function undo() {
    if (!hist.length || won || busy) return;
    var o = JSON.parse(hist.pop());
    g.stock = o.stock; g.waste = o.waste; g.f = o.f; g.t = o.t; g.score = o.score; g.moves = o.moves;
    sel = null; render(); save();
  }
  function afterMove() {
    sel = null;
    render(); save();
    checkWin();
  }
  function doMove(s, to) {
    snapshot(); ensureTimer();
    var src = pileArr(s.pile), dst = pileArr(to), from = s.pile.charAt(0);
    var moving = src.splice(s.idx);
    if (to.charAt(0) === 'f') g.score += 10;
    else if (from === 'w') g.score += 5;
    else if (from === 'f') g.score -= 15;
    Array.prototype.push.apply(dst, moving);
    if (from === 't' && src.length && !src[src.length - 1].up) { src[src.length - 1].up = true; g.score += 5; }
    g.score = Math.max(0, g.score);
    g.moves++;
    afterMove();
  }
  function drawStock() {
    var i;
    if (!g.stock.length && !g.waste.length) return;
    snapshot(); ensureTimer(); sel = null;
    if (g.stock.length) {
      var n = Math.min(g.draw, g.stock.length);
      for (i = 0; i < n; i++) { var c = g.stock.pop(); c.up = true; g.waste.push(c); }
    } else {
      g.stock = g.waste.reverse().map(function (c) { c.up = false; return c; });
      g.waste = [];
      g.score = Math.max(0, g.score - (g.draw === 1 ? 100 : 20));
    }
    g.moves++;
    render(); save();
  }
  function autoMove(s) {
    var src = pileArr(s.pile), n = src.length - s.idx, targets = [], i;
    if (n === 1) for (i = 0; i < 4; i++) targets.push('f' + i);
    for (i = 0; i < 7; i++) targets.push('t' + i);
    for (i = 0; i < targets.length; i++) {
      var T = targets[i];
      if (!canMove(s, T)) continue;
      if (T.charAt(0) === 't' && s.pile.charAt(0) === 't' && s.idx === 0 && src[0].r === 13) continue;
      doMove(s, T);
      return true;
    }
    return false;
  }
  function checkWin() {
    if (won || !g.f.every(function (p) { return p.length === 13; })) return;
    won = true; stopTimer(); save();
    var bonus = g.secs >= 30 ? Math.floor(700000 / g.secs) : 0;
    Endgame.show({
      key: 'solitaire-draw' + g.draw, title: 'YOU WON!', color: '#7dff6b',
      line: 'SOLVED IN ' + fmt(g.secs) + ' / ' + g.moves + ' MOVES',
      score: g.score + bonus, delay: 700,
      onAgain: function () { deal(g.draw); }
    });
  }
  function canAuto() {
    return !won && !busy && !g.stock.length && !g.waste.length &&
      g.t.every(function (p) { return p.every(function (c) { return c.up; }); });
  }
  function autoFinish() {
    if (!canAuto()) return;
    busy = true; render();
    var iv = setInterval(function () {
      var done = true;
      for (var i = 0; i < 7 && done; i++) {
        var p = g.t[i];
        if (!p.length) continue;
        for (var k = 0; k < 4; k++) {
          var s = { pile: 't' + i, idx: p.length - 1 };
          if (canMove(s, 'f' + k)) { doMove(s, 'f' + k); done = false; break; }
        }
      }
      if (done || won) { clearInterval(iv); busy = false; render(); }
    }, 90);
  }

  /* ---------- input ---------- */
  function onTap(pile, idx) {
    if (won || busy) return;
    if (pile === 's') { drawStock(); return; }
    var arr = pileArr(pile);
    if (sel) {
      if (sel.pile === pile && sel.idx === idx) {
        var s0 = sel; sel = null;
        if (!autoMove(s0)) render();
        return;
      }
      if (pile.charAt(0) !== 'w' && canMove(sel, pile)) { doMove(sel, pile); return; }
      sel = null;
    }
    if (idx >= 0 && arr[idx]) {
      var c = arr[idx];
      if (pile.charAt(0) === 't') {
        if (c.up) sel = { pile: pile, idx: idx };
        else if (idx === arr.length - 1) { snapshot(); ensureTimer(); c.up = true; g.score += 5; g.moves++; save(); }
      } else if (idx === arr.length - 1) {
        sel = { pile: pile, idx: idx };
      }
    }
    render();
  }
  solEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-pile]');
    if (b && !b.disabled) onTap(b.dataset.pile, +b.dataset.idx);
  });

  /* ---------- rendering ---------- */
  function cardEl(c, pile, idx, top, left, disabled, selected) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (c.up ? (red(c.s) ? ' red' : '') : ' down') + (selected ? ' sel' : '');
    b.style.top = top + 'px';
    if (left) b.style.left = left + 'px';
    b.dataset.pile = pile; b.dataset.idx = idx;
    b.disabled = !!disabled;
    if (c.up) {
      b.innerHTML = '<span class="r">' + RANKS[c.r] + '</span><span class="s">' + SUITS[c.s] + '</span>';
      b.setAttribute('aria-label', RANK_NAMES[c.r] + ' of ' + SUIT_NAMES[c.s] + (selected ? ', selected' : ''));
    } else {
      b.setAttribute('aria-label', 'face-down card');
    }
    return b;
  }
  function slotEl(pile, text, label) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'slot';
    b.dataset.pile = pile; b.dataset.idx = -1;
    b.textContent = text;
    b.setAttribute('aria-label', label);
    return b;
  }
  function col(h) {
    var d = document.createElement('div');
    d.className = 'col';
    d.style.height = h + 'px';
    return d;
  }

  function render() {
    var W = solEl.clientWidth || 330;
    var cw = (W - GAP * 6) / 7, ch = cw * 1.4;
    solEl.style.setProperty('--cw', cw + 'px');
    solEl.textContent = '';
    var i, j;

    var top = document.createElement('div'); top.className = 'srow';
    // stock
    var c0 = col(ch);
    if (g.stock.length) c0.appendChild(cardEl(g.stock[g.stock.length - 1], 's', g.stock.length - 1, 0, 0, busy, false));
    else c0.appendChild(slotEl('s', g.waste.length ? '↺' : '', g.waste.length ? 'Recycle waste pile' : 'Empty stock'));
    if (g.stock.length) c0.firstChild.setAttribute('aria-label', 'Draw from deck, ' + g.stock.length + ' cards left');
    top.appendChild(c0);
    // waste
    var c1 = col(ch);
    c1.style.zIndex = 3;
    var showN = Math.min(g.draw === 3 ? 3 : 1, g.waste.length);
    for (i = 0; i < showN; i++) {
      var wi = g.waste.length - showN + i, isTop = wi === g.waste.length - 1;
      c1.appendChild(cardEl(g.waste[wi], 'w', wi, 0, i * cw * 0.3, !isTop || busy, sel && sel.pile === 'w' && isTop));
    }
    top.appendChild(c1);
    top.appendChild(col(ch));
    for (i = 0; i < 4; i++) {
      var cf = col(ch), fp = g.f[i];
      if (fp.length) cf.appendChild(cardEl(fp[fp.length - 1], 'f' + i, fp.length - 1, 0, 0, busy, sel && sel.pile === 'f' + i));
      else cf.appendChild(slotEl('f' + i, 'A', 'Empty foundation'));
      top.appendChild(cf);
    }
    solEl.appendChild(top);

    var tab = document.createElement('div'); tab.className = 'srow';
    var downOff = cw * 0.2, upOff = cw * 0.36;
    for (i = 0; i < 7; i++) {
      var p = g.t[i], y = 0, offs = [];
      for (j = 0; j < p.length; j++) { offs.push(y); y += p[j].up ? upOff : downOff; }
      var height = p.length ? offs[p.length - 1] + ch : ch;
      var ct = col(height);
      if (!p.length) ct.appendChild(slotEl('t' + i, 'K', 'Empty column'));
      for (j = 0; j < p.length; j++) {
        var selected = !!(sel && sel.pile === 't' + i && j >= sel.idx);
        ct.appendChild(cardEl(p[j], 't' + i, j, offs[j], 0, busy || (!p[j].up && j !== p.length - 1), selected));
      }
      tab.appendChild(ct);
    }
    solEl.appendChild(tab);

    $('auto').hidden = !canAuto();
    $('mode').textContent = 'DRAW ' + g.draw;
    $('undo').disabled = !hist.length || busy || won;
    updateStat();
  }

  /* ---------- controls ---------- */
  function confirmNew(msg) { return won || g.moves === 0 || window.confirm(msg); }
  $('undo').addEventListener('click', undo);
  $('new').addEventListener('click', function () { if (confirmNew('Start a new game?')) deal(g.draw); });
  $('mode').addEventListener('click', function () {
    var next = g.draw === 1 ? 3 : 1;
    if (confirmNew('Switch to DRAW ' + next + ' and start a new game?')) deal(next);
  });
  $('auto').addEventListener('click', autoFinish);

  var HELP = [
    'Build the four stacks at the top, one per suit, from Ace up to King.',
    'In the seven columns, stack cards downward in alternating colors (red on black, black on red). You can move a whole run at once. Only a King can fill an empty column.',
    'Tap a card to select it, then tap where it should go. Tap the same card again to send it to the best spot for you. Tap the deck to draw.',
    'Face-down cards flip when uncovered. Move every card to the top stacks to win. UNDO is free, and DRAW 3 is the harder mode. Your game is saved if you leave.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (g) render(); }, 120); });

  Auth.require().then(function (s) {
    if (!s) return;
    if (load()) { hist = []; if (g.moves > 0) ensureTimer(); render(); checkWin(); }
    else deal(1);
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
