(function () {
  var GAME = 'ginrummy', TARGET = 100;
  var SUITS = ['♠︎', '♥︎', '♦︎', '♣︎'];
  var SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var RANK_NAMES = ['', 'ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
  var E = GinEngine;

  var $ = function (id) { return document.getElementById(id); };
  var stock, disc, hands, phase, handNo = 0, sel = null, newId = null, drawnDiscId = null;
  var totals = { me: 0, cpu: 0 }, wins = { me: 0, cpu: 0 }, reveal = false, laidIds = {}, matchOver = false, token = 0;

  function cname(c) { return RANK_NAMES[c.r] + ' of ' + SUIT_NAMES[c.s]; }
  function red(c) { return c.s === 1 || c.s === 2; }
  function wait(ms, fn) { var t = token; setTimeout(function () { if (t === token) fn(); }, ms); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function without(list, id) { return list.filter(function (c) { return c.id !== id; }); }
  function setMsg(t) { $('msg').textContent = t; }

  /* ---------- dealing ---------- */
  function newDeck() {
    var d = [], s, r, i;
    for (s = 0; s < 4; s++) for (r = 1; r <= 13; r++) d.push({ s: s, r: r, id: s * 13 + r - 1 });
    for (i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }
  function newMatch() {
    token++;
    totals = { me: 0, cpu: 0 }; wins = { me: 0, cpu: 0 }; handNo = 0; matchOver = false;
    Endgame.hide();
    deal();
  }
  function deal() {
    token++;
    var d = newDeck();
    hands = { me: d.splice(0, 10), cpu: d.splice(0, 10) };
    disc = [d.pop()]; stock = d;
    sel = null; newId = null; drawnDiscId = null; reveal = false; laidIds = {};
    $('resbox').hidden = true; $('acts').hidden = false;
    var first = handNo % 2 === 0 ? 'me' : 'cpu';
    handNo++;
    if (first === 'me') { phase = 'draw'; setMsg('YOUR TURN. DRAW FROM THE DECK OR TAKE THE DISCARD.'); render(); }
    else { phase = 'cpu'; setMsg('CPU GOES FIRST.'); render(); wait(900, cpuTurn); }
  }

  /* ---------- rendering ---------- */
  function cardNode(c, cw, tag) {
    var n = document.createElement(tag || 'div');
    if (tag === 'button') n.type = 'button';
    n.className = 'card' + (red(c) ? ' red' : '');
    n.style.setProperty('--cw', cw + 'px');
    n.innerHTML = '<span class="r">' + RANKS[c.r] + '</span><span class="s">' + SUITS[c.s] + '</span><span class="big">' + SUITS[c.s] + '</span>';
    n.setAttribute('aria-label', cname(c));
    return n;
  }
  function backNode(cw, tag) {
    var n = document.createElement(tag || 'div');
    if (tag === 'button') n.type = 'button';
    n.className = 'card down';
    n.style.setProperty('--cw', cw + 'px');
    n.setAttribute('aria-label', 'face-down card');
    return n;
  }
  function layout(container, groups, cw, build) {
    container.textContent = '';
    var n = groups.reduce(function (a, g) { return a + g.length; }, 0);
    var gaps = Math.max(0, groups.length - 1), gapPx = 12;
    var avail = container.clientWidth || 330;
    var step = n > 1 ? Math.min(cw * 0.85, (avail - cw - gapPx * gaps) / (n - 1)) : 0;
    step = Math.max(12, step);
    var x = 0;
    groups.forEach(function (g, gi) {
      if (gi > 0) x += gapPx;
      g.forEach(function (c) {
        var node = build(c);
        node.style.left = x + 'px';
        node.style.top = '10px';
        container.appendChild(node);
        x += step;
      });
    });
    container.style.height = (cw * 1.4 + 12) + 'px';
  }
  function groupsFor(hand) {
    var a = E.analyze(hand), g = a.melds.slice();
    if (a.dead.length) g.push(a.dead);
    return { groups: g, a: a };
  }
  function bestDw(hand) {
    if (hand.length <= 10) return E.analyze(hand).dw;
    var best = 999;
    hand.forEach(function (c) { best = Math.min(best, E.analyze(without(hand, c.id)).dw); });
    return best;
  }

  function render() {
    $('scores').textContent = 'YOU ' + totals.me + ' / CPU ' + totals.cpu;
    // opponent
    var oh = $('oppHand');
    if (reveal) {
      var og = groupsFor(hands.cpu).groups;
      layout(oh, og, 34, function (c) {
        var n = cardNode(c, 34);
        if (laidIds[c.id]) n.classList.add('laid');
        return n;
      });
      $('oppInfo').textContent = 'DEADWOOD ' + E.analyze(hands.cpu).dw;
    } else {
      layout(oh, [hands.cpu], 34, function () { return backNode(34); });
      $('oppInfo').textContent = hands.cpu.length + ' CARDS';
    }
    // my hand
    var mg = groupsFor(hands.me);
    layout($('myHand'), mg.groups, 48, function (c) {
      var n = cardNode(c, 48, 'button');
      n.dataset.id = c.id;
      if (sel === c.id) { n.classList.add('sel'); n.style.top = '0px'; }
      if (newId === c.id) n.classList.add('new');
      n.disabled = phase !== 'discard';
      return n;
    });
    $('dw').textContent = bestDw(hands.me);
    // piles
    var st = $('stock'); st.textContent = '';
    if (stock.length) st.appendChild(Object.assign(backNode(52), { }));
    else { var e1 = document.createElement('div'); e1.className = 'pslot'; e1.style.setProperty('--cw', '52px'); st.appendChild(e1); }
    st.setAttribute('aria-label', 'Draw from deck, ' + stock.length + ' cards left');
    st.disabled = phase !== 'draw' || !stock.length;
    var ds = $('disc'); ds.textContent = '';
    if (disc.length) ds.appendChild(cardNode(disc[disc.length - 1], 52));
    else { var e2 = document.createElement('div'); e2.className = 'pslot'; e2.style.setProperty('--cw', '52px'); ds.appendChild(e2); }
    ds.disabled = phase !== 'draw' || !disc.length;
    // buttons
    var can = phase === 'discard' && sel !== null && sel !== drawnDiscId;
    $('discard').disabled = !can;
    var kb = $('knock'), knockOk = false, label = 'KNOCK';
    if (can) {
      var dw = E.analyze(without(hands.me, sel)).dw;
      knockOk = dw <= 10;
      label = dw === 0 ? 'GIN!' : 'KNOCK ' + dw;
    }
    kb.disabled = !knockOk;
    kb.textContent = label;
  }

  /* ---------- player actions ---------- */
  $('stock').addEventListener('click', function () {
    if (phase !== 'draw' || !stock.length) return;
    var c = stock.pop();
    hands.me.push(c); newId = c.id; drawnDiscId = null; sel = null;
    phase = 'discard';
    setMsg('YOU DREW THE ' + cname(c).toUpperCase() + '. NOW DISCARD ONE CARD.');
    render();
  });
  $('disc').addEventListener('click', function () {
    if (phase !== 'draw' || !disc.length) return;
    var c = disc.pop();
    hands.me.push(c); newId = c.id; drawnDiscId = c.id; sel = null;
    phase = 'discard';
    setMsg('YOU TOOK THE ' + cname(c).toUpperCase() + '. NOW DISCARD ONE CARD.');
    render();
  });
  $('myHand').addEventListener('click', function (e) {
    var b = e.target.closest('.card');
    if (!b || phase !== 'discard') return;
    var id = +b.dataset.id;
    sel = sel === id ? null : id;
    render();
  });
  $('discard').addEventListener('click', function () {
    if (phase !== 'discard' || sel === null || sel === drawnDiscId) return;
    var c = byId(hands.me, sel);
    hands.me = without(hands.me, sel);
    disc.push(c); sel = null; newId = null; drawnDiscId = null;
    afterDiscard('me', c);
  });
  $('knock').addEventListener('click', function () {
    if (phase !== 'discard' || sel === null || sel === drawnDiscId) return;
    if (E.analyze(without(hands.me, sel)).dw > 10) return;
    var c = byId(hands.me, sel);
    hands.me = without(hands.me, sel);
    disc.push(c); sel = null; newId = null; drawnDiscId = null;
    showdown('me');
  });

  function afterDiscard(who, c) {
    if (stock.length <= 2) { deadHand(); return; }
    if (who === 'me') {
      phase = 'cpu';
      setMsg('YOU DISCARDED THE ' + cname(c).toUpperCase() + '.');
      render();
      wait(900, cpuTurn);
    } else {
      phase = 'draw';
      setMsg('CPU DISCARDED THE ' + cname(c).toUpperCase() + '. YOUR TURN.');
      render();
    }
  }

  /* ---------- computer ---------- */
  function cpuTurn() {
    phase = 'cpu';
    var up = disc[disc.length - 1], hand = hands.cpu, takenFromDisc = null;
    var now = E.analyze(hand).dw, bestWith = 999;
    var withUp = hand.concat([up]);
    withUp.forEach(function (c) { if (c.id !== up.id) bestWith = Math.min(bestWith, E.analyze(without(withUp, c.id)).dw); });
    var drew;
    if (bestWith < now) { drew = disc.pop(); takenFromDisc = drew; setMsg('CPU TOOK THE ' + cname(drew).toUpperCase() + '.'); }
    else { drew = stock.pop(); setMsg('CPU DREW FROM THE DECK.'); }
    hands.cpu.push(drew);
    render();
    wait(1000, function () {
      var h = hands.cpu, best = null, bd = 999;
      h.forEach(function (c) {
        if (takenFromDisc && c.id === takenFromDisc.id) return;
        var dw = E.analyze(without(h, c.id)).dw;
        if (dw < bd || (dw === bd && best && E.val(c) > E.val(best))) { bd = dw; best = c; }
      });
      hands.cpu = without(h, best.id);
      disc.push(best);
      var knock = bd === 0 || (bd <= 10 && (bd <= 6 || stock.length < 14));
      if (knock) { showdown('cpu'); return; }
      afterDiscard('cpu', best);
    });
  }

  /* ---------- showdown ---------- */
  function showdown(knocker) {
    phase = 'result'; reveal = true;
    var other = knocker === 'me' ? 'cpu' : 'me';
    var r = E.score(hands[knocker], hands[other]);
    r.laid.forEach(function (c) { laidIds[c.id] = true; });
    var winnerSide = r.winner === 'knocker' ? knocker : other;
    totals[winnerSide] += r.points;
    wins[winnerSide]++;
    var kname = knocker === 'me' ? 'YOU' : 'CPU', oname = knocker === 'me' ? 'CPU' : 'YOU';
    var lines = [];
    if (r.type === 'gin') {
      lines.push(kname + ' WENT GIN!');
      lines.push(oname + ' HAD ' + r.odw + ' DEADWOOD.');
    } else {
      lines.push(kname + ' KNOCKED WITH ' + r.kdw + '.');
      lines.push(oname + ' HAD ' + r.odw + (r.laid.length ? ' AFTER LAYING OFF ' + r.laid.length : '') + '.');
      if (r.type === 'undercut') lines.push('UNDERCUT!');
    }
    lines.push('<b>' + (winnerSide === 'me' ? 'YOU' : 'CPU') + ' SCORE +' + r.points + '</b>');
    matchOver = totals.me >= TARGET || totals.cpu >= TARGET;
    resultUI(lines);
    setMsg(winnerSide === 'me' ? 'NICE HAND!' : 'BETTER LUCK NEXT HAND.');
  }
  function deadHand() {
    phase = 'result'; reveal = true;
    matchOver = false;
    resultUI(['THE DECK RAN OUT.', '<b>NO SCORE THIS HAND.</b>']);
    setMsg('A DRAW.');
  }
  function resultUI(lines) {
    render();
    $('acts').hidden = true;
    $('reslines').innerHTML = lines.join('<br>');
    $('next').textContent = matchOver ? 'FINISH' : 'NEXT HAND';
    $('resbox').hidden = false;
  }
  $('next').addEventListener('click', function () {
    if (matchOver) finishMatch(); else deal();
  });
  function finishMatch() {
    var meWon = totals.me >= totals.cpu;
    var meFinal = totals.me + 25 * wins.me + (meWon ? 100 : 0);
    var cpuFinal = totals.cpu + 25 * wins.cpu + (meWon ? 0 : 100);
    Endgame.show({
      key: GAME, title: meWon ? 'YOU WIN THE MATCH!' : 'CPU WINS THE MATCH',
      color: meWon ? '#7dff6b' : '#ff7b8a',
      line: 'FINAL: YOU ' + meFinal + ' / CPU ' + cpuFinal,
      score: meFinal, delay: 200, onAgain: newMatch
    });
  }

  window.addEventListener('resize', function () { if (hands) render(); });

  var HELP = [
    'Make melds: sets (3 or 4 cards of the same rank) or runs (3 or more in a row of the same suit, Ace low). Cards outside melds are deadwood: Ace 1, number cards face value, J Q K 10.',
    'Each turn, draw from the DECK or take the top DISCARD, then discard one card. Your hand is grouped into melds for you, with deadwood at the right.',
    'Tap a card, then press DISCARD. When your deadwood is 10 or less, you can pick a card and press KNOCK (GIN if it is 0) to end the hand.',
    'The knocker scores the difference in deadwood. The other player can lay off cards onto your melds first. If they end up equal or lower, they undercut you and score a bonus. First to 100 wins the match.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  Auth.require().then(function (s) {
    if (!s) return;
    newMatch();
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
