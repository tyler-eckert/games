/* Gin Rummy rules engine: melds, deadwood, lay-offs, hand scoring. Works in the browser and in Node.
   A card is { s: 0-3 (suit), r: 1-13 (ace low) }. */
(function (root) {
  function val(c) { return Math.min(c.r, 10); }
  function sum(cards) { return cards.reduce(function (a, c) { return a + val(c); }, 0); }

  function allMelds(cards) {
    var n = cards.length, melds = [], i, j, k;
    function add(idxs) {
      var m = 0, v = 0;
      idxs.forEach(function (x) { m |= (1 << x); v += val(cards[x]); });
      melds.push({ m: m, v: v, idx: idxs });
    }
    var byRank = {};
    cards.forEach(function (c, x) { (byRank[c.r] = byRank[c.r] || []).push(x); });
    Object.keys(byRank).forEach(function (r) {
      var g = byRank[r];
      if (g.length < 3) return;
      for (i = 0; i < g.length; i++) for (j = i + 1; j < g.length; j++) for (k = j + 1; k < g.length; k++) add([g[i], g[j], g[k]]);
      if (g.length === 4) add(g.slice());
    });
    for (var s = 0; s < 4; s++) {
      var inSuit = [];
      cards.forEach(function (c, x) { if (c.s === s) inSuit.push(x); });
      inSuit.sort(function (a, b) { return cards[a].r - cards[b].r; });
      for (i = 0; i < inSuit.length; i++) {
        var run = [inSuit[i]];
        for (j = i + 1; j < inSuit.length; j++) {
          if (cards[inSuit[j]].r !== cards[inSuit[j - 1]].r + 1) break;
          run.push(inSuit[j]);
          if (run.length >= 3) add(run.slice());
        }
      }
    }
    return melds;
  }

  // Best way to group a hand into melds, minimizing deadwood.
  function analyze(cards) {
    var melds = allMelds(cards), total = sum(cards);
    var best = { dw: total, sel: [] };
    function rec(start, used, sel, melded) {
      var dw = total - melded;
      if (dw < best.dw) best = { dw: dw, sel: sel.slice() };
      for (var i = start; i < melds.length; i++) {
        if (!(melds[i].m & used)) {
          sel.push(i);
          rec(i + 1, used | melds[i].m, sel, melded + melds[i].v);
          sel.pop();
        }
      }
    }
    rec(0, 0, [], 0);
    var usedMask = 0, groups = [];
    best.sel.forEach(function (i) {
      usedMask |= melds[i].m;
      groups.push(melds[i].idx.map(function (x) { return cards[x]; }));
    });
    var dead = cards.filter(function (c, x) { return !(usedMask & (1 << x)); });
    groups.forEach(sortMeld);
    dead.sort(function (a, b) { return a.r - b.r || a.s - b.s; });
    return { dw: best.dw, melds: groups, dead: dead };
  }

  function isSet(meld) { return meld.length >= 3 && meld[0].r === meld[1].r; }
  function sortMeld(m) {
    if (isSet(m)) m.sort(function (a, b) { return a.s - b.s; });
    else m.sort(function (a, b) { return a.r - b.r; });
  }
  function canAttach(meld, c) {
    if (isSet(meld)) return meld.length < 4 && c.r === meld[0].r;
    if (c.s !== meld[0].s) return false;
    var lo = meld[0].r, hi = meld[meld.length - 1].r;
    return c.r === lo - 1 || c.r === hi + 1;
  }

  // Score a finished hand. knocker has 10 melded/deadwood cards, other is the defender.
  function score(knockerCards, otherCards) {
    var ka = analyze(knockerCards), oa = analyze(otherCards);
    var gin = ka.dw === 0;
    var melds = ka.melds.map(function (m) { return m.slice(); });
    var dead = oa.dead.slice(), laid = [];
    if (!gin) {
      var changed = true;
      while (changed) {
        changed = false;
        for (var i = 0; i < dead.length && !changed; i++) {
          for (var k = 0; k < melds.length; k++) {
            if (canAttach(melds[k], dead[i])) {
              melds[k].push(dead[i]); sortMeld(melds[k]);
              laid.push(dead[i]); dead.splice(i, 1);
              changed = true;
              break;
            }
          }
        }
      }
    }
    var odw = sum(dead), r = { kdw: ka.dw, odw: odw, laid: laid, kAnalysis: ka, oAnalysis: oa, oDead: dead };
    if (gin) { r.type = 'gin'; r.winner = 'knocker'; r.points = 25 + odw; }
    else if (ka.dw < odw) { r.type = 'knock'; r.winner = 'knocker'; r.points = odw - ka.dw; }
    else { r.type = 'undercut'; r.winner = 'other'; r.points = ka.dw - odw + 25; }
    return r;
  }

  var api = { val: val, sum: sum, analyze: analyze, canAttach: canAttach, score: score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GinEngine = api;
})(typeof window !== 'undefined' ? window : this);
