/* Sudoku engine: solver, uniqueness check, puzzle generator. Works in the browser and in Node. */
(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function pc(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }

  // Count solutions (up to `limit`). Returns { count, first } where first is one solved grid.
  function search(grid, limit, rnd) {
    var rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0), i;
    for (i = 0; i < 81; i++) {
      var v = grid[i];
      if (!v) continue;
      var bit = 1 << v, r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      if ((rows[r] | cols[c] | boxes[b]) & bit) return { count: 0, first: null };
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    var g = grid.slice(), count = 0, first = null;
    function rec() {
      var best = -1, bestMask = 0, bestN = 10, k;
      for (k = 0; k < 81; k++) {
        if (g[k]) continue;
        var r2 = (k / 9) | 0, c2 = k % 9, b2 = ((r2 / 3) | 0) * 3 + ((c2 / 3) | 0);
        var m = ~(rows[r2] | cols[c2] | boxes[b2]) & 0x3FE, n = pc(m);
        if (n < bestN) { bestN = n; best = k; bestMask = m; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (!first) first = g.slice(); return count >= limit; }
      if (bestN === 0) return false;
      var digits = [], d;
      for (d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
      if (rnd) shuffle(digits, rnd);
      var br = (best / 9) | 0, bc = best % 9, bb = ((br / 3) | 0) * 3 + ((bc / 3) | 0);
      for (var x = 0; x < digits.length; x++) {
        var bt = 1 << digits[x];
        g[best] = digits[x]; rows[br] |= bt; cols[bc] |= bt; boxes[bb] |= bt;
        if (rec()) return true;
        g[best] = 0; rows[br] &= ~bt; cols[bc] &= ~bt; boxes[bb] &= ~bt;
      }
      return false;
    }
    rec();
    return { count: count, first: first };
  }

  var CLUES = { easy: 40, medium: 33, hard: 28, daily: 32 };

  function generate(level, rnd) {
    rnd = rnd || Math.random;
    var target = CLUES[level] || 33;
    var solution = search(new Array(81).fill(0), 1, rnd).first;
    var puzzle = solution.slice();
    var order = shuffle(Array.apply(null, { length: 81 }).map(function (_, i) { return i; }), rnd);
    var givens = 81;
    for (var k = 0; k < order.length && givens > target; k++) {
      var i = order[k], keep = puzzle[i];
      puzzle[i] = 0;
      if (search(puzzle, 2).count !== 1) puzzle[i] = keep; else givens--;
    }
    return { puzzle: puzzle, solution: solution, givens: givens };
  }

  function dailySeed(d) {
    d = d || new Date();
    var n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return (n ^ 0x9E3779B9) >>> 0;
  }

  var api = { mulberry32: mulberry32, search: search, generate: generate, dailySeed: dailySeed, CLUES: CLUES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuEngine = api;
})(typeof window !== 'undefined' ? window : this);
