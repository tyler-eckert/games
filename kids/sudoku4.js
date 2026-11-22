/* Kids: picture sudoku (4x4 and 6x6). */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  var PICS = ['🐶', '🐱', '🐸', '🐰', '🐥', '🐷'];

  function ok(g, n, br, bc, r, c, v) {
    var i, j;
    for (i = 0; i < n; i++) { if (g[r][i] === v || g[i][c] === v) return false; }
    var r0 = r - r % br, c0 = c - c % bc;
    for (i = 0; i < br; i++) for (j = 0; j < bc; j++) if (g[r0 + i][c0 + j] === v) return false;
    return true;
  }
  function count(g, n, br, bc, limit) {
    var found = 0;
    (function go() {
      if (found >= limit) return;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (!g[r][c]) {
        for (var v = 1; v <= n; v++) if (ok(g, n, br, bc, r, c, v)) { g[r][c] = v; go(); g[r][c] = 0; if (found >= limit) return; }
        return;
      }
      found++;
    })();
    return found;
  }
  function solved(n, br, bc) {
    var g = [], r, c;
    for (r = 0; r < n; r++) { g.push([]); for (c = 0; c < n; c++) g[r].push(0); }
    (function fill(pos) {
      if (pos === n * n) return true;
      var r = Math.floor(pos / n), c = pos % n, vs = K.shuffle(Array.apply(null, Array(n)).map(function (_, i) { return i + 1; }));
      for (var k = 0; k < vs.length; k++) if (ok(g, n, br, bc, r, c, vs[k])) { g[r][c] = vs[k]; if (fill(pos + 1)) return true; g[r][c] = 0; }
      return false;
    })(0);
    return g;
  }
  function make(n, br, bc, clues) {
    var sol = solved(n, br, bc), p = sol.map(function (r) { return r.slice(); }), cells = [], i, left = n * n;
    for (i = 0; i < n * n; i++) cells.push(i);
    K.shuffle(cells).forEach(function (pos) {
      if (left <= clues) return;
      var r = Math.floor(pos / n), c = pos % n, keep = p[r][c];
      p[r][c] = 0;
      var copy = p.map(function (x) { return x.slice(); });
      if (count(copy, n, br, bc, 2) !== 1) p[r][c] = keep; else left--;
    });
    return { sol: sol, puz: p };
  }

  K.reg({ id: 'sudoku4', subject: 'math', title: 'PICTURE SUDOKU', desc: 'Every row, column and box gets each picture once', emoji: '🧩', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: '4 by 4, lots of clues', value: { n: 4, br: 2, bc: 2, clues: 10 } }, { label: 'MEDIUM', sub: '4 by 4, fewer clues', value: { n: 4, br: 2, bc: 2, clues: 6 } }, { label: 'HARD', sub: '6 by 6 board', value: { n: 6, br: 2, bc: 3, clues: 16 } }], function (cfg) { play(cfg); });
    function play(cfg) {
      var n = cfg.n, br = cfg.br, bc = cfg.bc, pz = make(n, br, bc, cfg.clues), g = pz.puz.map(function (r) { return r.slice(); });
      var sel = null, hints = 0, nums = false, done = false, tok = K.token;
      box.textContent = '';
      var info = h('div', 'ksub', 'Tap a square, then tap a picture.');
      var board = h('div', 'ksd'); board.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
      var pal = h('div', 'kpal'), cells = [];
      function sym(v) { return v ? (nums ? String(v) : PICS[v - 1]) : ''; }
      function bad(r, c) {
        var v = g[r][c]; if (!v) return false;
        var i, j;
        for (i = 0; i < n; i++) { if ((i !== c && g[r][i] === v) || (i !== r && g[i][c] === v)) return true; }
        var r0 = r - r % br, c0 = c - c % bc;
        for (i = 0; i < br; i++) for (j = 0; j < bc; j++) if ((r0 + i !== r || c0 + j !== c) && g[r0 + i][c0 + j] === v) return true;
        return false;
      }
      function paint() {
        board.classList.toggle('num', nums);
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
          var b = cells[r * n + c]; b.textContent = sym(g[r][c]);
          b.className = (r % br === 0 && r ? 'bt ' : '') + (c % bc === 0 && c ? 'bl ' : '') + (pz.puz[r][c] ? 'clue ' : '') + (sel && sel[0] === r && sel[1] === c ? 'sel ' : '') + (bad(r, c) ? 'bad' : '');
        }
        Array.prototype.forEach.call(pal.querySelectorAll('.pv'), function (p, i) { p.textContent = nums ? String(i + 1) : PICS[i]; });
      }
      function check() {
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (g[r][c] !== pz.sol[r][c]) return false;
        return true;
      }
      function win() {
        done = true;
        var stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
        K.setStars(ctx.game.id, stars);
        box.textContent = '';
        box.appendChild(h('h2', 'ktitle', 'PUZZLE SOLVED!'));
        var s = h('div', 'kstars');
        for (var i = 0; i < 3; i++) { var x = h('span', '', '★'); if (i >= stars) x.style.color = '#2b2a5c'; s.appendChild(x); }
        box.appendChild(s);
        box.appendChild(h('p', 'ksub', hints ? hints + ' hint' + (hints > 1 ? 's' : '') + ' used' : 'No hints. Super solver!'));
        box.appendChild(K.btn('NEW PUZZLE', 'go', ctx.again));
        box.appendChild(K.btn('MENU', '', ctx.menu));
      }
      function place(v) {
        if (done || !sel || pz.puz[sel[0]][sel[1]]) { info.textContent = 'Tap an empty square first.'; return; }
        g[sel[0]][sel[1]] = v; paint();
        var full = g.every(function (r) { return r.every(function (x) { return x; }); });
        if (full) { if (check()) win(); else info.textContent = 'Something is not right. Look for red squares.'; }
        else info.textContent = bad(sel[0], sel[1]) ? 'That picture is already in the row, column or box.' : 'Nice.';
      }
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) (function (r, c) {
        var b = h('button', '', ''); b.type = 'button'; b.setAttribute('aria-label', 'Row ' + (r + 1) + ' column ' + (c + 1));
        b.addEventListener('click', function () { if (!done) { sel = [r, c]; paint(); } });
        board.appendChild(b); cells.push(b);
      })(r, c);
      for (var v = 1; v <= n; v++) (function (v) {
        var b = h('button', 'pv', ''); b.type = 'button'; b.addEventListener('click', function () { place(v); }); pal.appendChild(b);
      })(v);
      var er = h('button', 'er', 'ERASE'); er.type = 'button';
      er.addEventListener('click', function () { if (sel && !pz.puz[sel[0]][sel[1]] && !done) { g[sel[0]][sel[1]] = 0; paint(); } });
      pal.appendChild(er);
      box.appendChild(info); box.appendChild(board); box.appendChild(pal);
      var row = h('div', 'krow');
      row.appendChild(K.btn('HINT', '', function () {
        if (done) return;
        var empties = [];
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (g[r][c] !== pz.sol[r][c]) empties.push([r, c]);
        if (!empties.length) return;
        var e = sel && g[sel[0]][sel[1]] !== pz.sol[sel[0]][sel[1]] && !pz.puz[sel[0]][sel[1]] ? sel : K.pick(empties);
        g[e[0]][e[1]] = pz.sol[e[0]][e[1]]; sel = e; hints++; paint();
        info.textContent = 'Hint added. Hints lower your stars.';
        if (check()) win();
      }));
      row.appendChild(K.btn('NUMBERS', '', function () { nums = !nums; this.textContent = nums ? 'PICTURES' : 'NUMBERS'; paint(); }));
      box.appendChild(row);
      paint();
    }
  } });
})();
