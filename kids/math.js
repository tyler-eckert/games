/* Kids: math games. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h, R = K.rand;
  var LV3 = [{ label: 'EASY', sub: '1st grade', value: 1 }, { label: 'MEDIUM', sub: '2nd to 3rd grade', value: 2 }, { label: 'HARD', sub: '3rd to 4th grade', value: 3 }];

  /* ---------- quick facts: addition, subtraction, multiplication, division ---------- */
  function problem(op, lv) {
    var a, b, q;
    if (op === '+') {
      if (lv === 1) { a = R(0, 10); b = R(0, 10); }
      else if (lv === 2) { a = R(10, 99); b = R(1, 99); }
      else { a = R(100, 999); b = R(100, 999); }
      return { a: a, b: b, ans: a + b, op: '+', stack: true };
    }
    if (op === '-') {
      if (lv === 1) { a = R(2, 20); b = R(0, a); }
      else if (lv === 2) { a = R(20, 99); b = R(1, a - 1); if (a % 10 >= b % 10 && Math.random() < 0.7) { b = (R(0, Math.floor(a / 10) - 1)) * 10 + R(a % 10 + 1, 9); if (b >= a) b = a - 1; } }
      else { a = R(200, 999); b = R(100, a - 1); }
      return { a: a, b: b, ans: a - b, op: '-', stack: true };
    }
    if (op === '*') {
      if (lv === 1) { a = R(0, 5); b = R(0, 5); }
      else if (lv === 2) { a = R(2, 10); b = R(2, 10); }
      else { a = Math.random() < 0.5 ? R(6, 12) : R(12, 25); b = Math.random() < 0.5 ? R(6, 12) : R(2, 9); }
      return { a: a, b: b, ans: a * b, op: '×' };
    }
    if (lv === 1) { b = R(1, 5); q = R(1, 5); }
    else if (lv === 2) { b = R(2, 10); q = R(2, 10); }
    else { b = R(2, 12); q = R(6, 30); }
    return { a: b * q, b: b, ans: q, op: '÷' };
  }
  function quickGame(id, op, title, desc, emoji) {
    K.reg({ id: id, subject: 'math', title: title, desc: desc, emoji: emoji, run: function (box, ctx) {
      K.levels(box, LV3, function (lv) {
        K.quiz(box, ctx, { total: 10, delay: 700, make: function () {
          var p = problem(op, lv);
          return { build: function (stage, done) {
            if (p.stack) {
              var s = h('div', 'kstack');
              s.appendChild(h('span')); s.appendChild(h('span', '', String(p.a)));
              s.appendChild(h('span', 'op', p.op)); s.appendChild(h('span', '', String(p.b)));
              s.appendChild(h('div', 'ln'));
              stage.appendChild(s);
            } else stage.appendChild(h('div', 'kbig', p.a + ' ' + p.op + ' ' + p.b + ' = ?'));
            K.numpad(stage, { max: 4, check: function (v) { return +v === p.ans; }, wrong: function () { return 'THE ANSWER IS ' + p.ans + '.'; } }, done);
          } };
        } });
      });
    } });
  }
  quickGame('add', '+', 'ADDITION', 'Stacked sums, fast', '➕');
  quickGame('sub', '-', 'SUBTRACTION', 'Stacked, with borrowing', '➖');
  quickGame('mul', '*', 'MULTIPLICATION', 'Quick times facts', '✖️');
  quickGame('div', '/', 'DIVISION', 'Quick division facts', '➗');

  /* ---------- times table climber ---------- */
  K.reg({ id: 'climb', subject: 'math', title: 'TIMES TABLE CLIMBER', desc: 'Climb 10 rungs. Misses come back', emoji: '🧗', run: function (box, ctx) {
    box.textContent = '';
    box.appendChild(h('p', 'ksub', 'Which table?'));
    var row = h('div', 'krow'); box.appendChild(row);
    var opts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'MIX'];
    opts.forEach(function (t) { row.appendChild(K.btn(String(t), '', function () { start(t); })); });
    function start(t) {
      var seen = {};
      K.quiz(box, ctx, { total: 10, retry: true, delay: 600, hud: function (st) { return 'RUNG ' + Math.min(st.right + 1, 10) + ' OF 10'; }, make: function (i, st) {
        var a, b, key, n = 0;
        do { a = t === 'MIX' ? R(2, 12) : t; b = R(2, 12); key = a + 'x' + b; n++; } while (seen[key] && n < 20);
        seen[key] = 1;
        if (Math.random() < 0.5) { var x = a; a = b; b = x; }
        return { build: function (stage, done) {
          var lad = h('div', 'kclimb');
          for (var r = 0; r < 10; r++) lad.appendChild(h('i', r < st.right ? 'on' : ''));
          stage.appendChild(lad);
          stage.appendChild(h('div', 'kemoji', '🧗'));
          stage.appendChild(h('div', 'kbig', a + ' × ' + b + ' = ?'));
          K.numpad(stage, { max: 3, check: function (v) { return +v === a * b; }, wrong: function () { return a + ' × ' + b + ' = ' + (a * b) + '. THIS ONE COMES BACK.'; } }, done);
        } };
      } });
    }
  } });

  /* ---------- fraction pizza ---------- */
  function pizza(n, shaded, tap, onTap) {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('width', '190'); svg.setAttribute('height', '190');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Pizza cut into ' + n + ' slices');
    var cells = [];
    for (var i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M100 100 L' + (100 + 90 * Math.cos(a0)).toFixed(1) + ' ' + (100 + 90 * Math.sin(a0)).toFixed(1) +
        ' A90 90 0 0 1 ' + (100 + 90 * Math.cos(a1)).toFixed(1) + ' ' + (100 + 90 * Math.sin(a1)).toFixed(1) + ' Z');
      p.setAttribute('stroke', '#0b0a1f'); p.setAttribute('stroke-width', '3');
      p.setAttribute('fill', shaded(i) ? '#ffc83d' : '#1b1a47');
      if (tap) { p.style.cursor = 'pointer'; (function (idx, el) { el.addEventListener('click', function () { onTap(idx, el); }); })(i, p); }
      svg.appendChild(p); cells.push(p);
    }
    return { svg: svg, cells: cells };
  }
  K.reg({ id: 'pizza', subject: 'math', title: 'FRACTION PIZZA', desc: 'Slice, shade and name fractions', emoji: '🍕', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: 'Halves and fourths', value: [2, 4] }, { label: 'MEDIUM', sub: 'Add thirds and sixths', value: [2, 3, 4, 6] }, { label: 'HARD', sub: 'Add fifths and eighths', value: [3, 4, 5, 6, 8] }], function (dens) {
      K.quiz(box, ctx, { total: 8, delay: 800, make: function (i) {
        var n = K.pick(dens), k = R(1, n - 1), frac = k + '/' + n;
        if (i % 2 === 0) {
          return { build: function (stage, done) {
            stage.appendChild(h('div', 'kbig', 'Make ' + frac));
            var on = {}, cnt = h('div', 'ksub', '0 OF ' + n + ' SHADED');
            var p = pizza(n, function () { return false; }, true, function (idx, el) {
              on[idx] = !on[idx]; el.setAttribute('fill', on[idx] ? '#ffc83d' : '#1b1a47'); cnt.textContent = Object.keys(on).filter(function (x) { return on[x]; }).length + ' OF ' + n + ' SHADED';
            });
            stage.appendChild(p.svg); stage.appendChild(cnt);
            stage.appendChild(K.btn('CHECK', 'go', function () {
              var c = Object.keys(on).filter(function (x) { return on[x]; }).length;
              done(c === k, c === k ? 'YES! ' + frac + ' IS ' + k + ' OUT OF ' + n + ' SLICES.' : 'YOU SHADED ' + c + '. ' + frac + ' MEANS ' + k + ' OUT OF ' + n + '.');
            }));
          } };
        }
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'ksub', 'What fraction is shaded?'));
          stage.appendChild(pizza(n, function (j) { return j < k; }, false).svg);
          var set = {}; set[frac] = 1; var tries = 0;
          while (Object.keys(set).length < 4 && tries++ < 50) { var kk = R(1, n - 1), nn = Math.random() < 0.5 ? n : K.pick(dens); if (kk < nn) set[kk + '/' + nn] = 1; }
          var labs = K.shuffle(Object.keys(set));
          K.choices(stage, labs, labs.indexOf(frac), done, k + ' OF ' + n + ' SLICES IS ' + frac + '.');
        } };
      } });
    });
  } });

  /* ---------- make change shop ---------- */
  function money(c) { return (c >= 100 ? '$' + Math.floor(c / 100) + '.' : '$0.') + ('0' + (c % 100)).slice(-2); }
  var COINS = { 1: ['1¢', '#c97b4a'], 5: ['5¢', '#b9c2cc'], 10: ['10¢', '#dfe6ee'], 25: ['25¢', '#c9d1db'], 100: ['$1', ''], 500: ['$5', ''] };
  function coinEl(v) {
    var b = h('button', 'kcoin' + (v === 25 ? ' q' : '') + (v >= 100 ? ' bill' : ''), COINS[v][0]);
    b.type = 'button'; if (COINS[v][1]) b.style.background = COINS[v][1];
    b.setAttribute('aria-label', COINS[v][0]); return b;
  }
  K.reg({ id: 'change', subject: 'math', title: 'MAKE CHANGE SHOP', desc: 'Count back the right change', emoji: '🛒', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: 'Pay $1, prices end in 0 or 5', value: 1 }, { label: 'MEDIUM', sub: 'Pay $1, any price', value: 2 }, { label: 'HARD', sub: 'Pay with $5 or $10 bills', value: 3 }], function (lv) {
      K.quiz(box, ctx, { total: 6, delay: 900, make: function () {
        var paid = 100, price, denoms = [25, 10, 5, 1];
        if (lv === 1) price = R(1, 19) * 5;
        else if (lv === 2) price = R(5, 99);
        else { paid = Math.random() < 0.5 ? 500 : 1000; price = Math.round(R(101, paid - 5) / 5) * 5; denoms = [100, 25, 10, 5, 1]; }
        var change = paid - price;
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'ksub', 'A customer buys something for ' + money(price) + ' and pays with ' + money(paid) + '.'));
          stage.appendChild(h('div', 'kbig', 'GIVE CHANGE'));
          var tray = h('div', 'ktray'), total = 0, items = [];
          var sum = h('div', 'ksub', 'IN THE TRAY: ' + money(0));
          function paint() { tray.textContent = ''; items.forEach(function (v, i) { var c = coinEl(v); c.addEventListener('click', function () { items.splice(i, 1); total -= v; paint(); }); tray.appendChild(c); }); sum.textContent = 'IN THE TRAY: ' + money(total); }
          var cs = h('div', 'kcoins');
          denoms.forEach(function (v) { var c = coinEl(v); c.addEventListener('click', function () { if (items.length < 30) { items.push(v); total += v; paint(); } }); cs.appendChild(c); });
          stage.appendChild(cs); stage.appendChild(tray); stage.appendChild(sum);
          stage.appendChild(K.btn('GIVE CHANGE', 'go', function () {
            done(total === change, total === change ? 'YES! ' + money(price) + ' + ' + money(change) + ' = ' + money(paid) + '.' : 'THE CHANGE IS ' + money(change) + '. YOU GAVE ' + money(total) + '.');
          }));
          stage.appendChild(h('div', 'knote', 'Tap coins to add. Tap one in the tray to take it back.'));
        } };
      } });
    });
  } });

  /* ---------- clock and time ---------- */
  function clockSvg(hh, mm) {
    var NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 200 200'); s.setAttribute('width', '190'); s.setAttribute('height', '190');
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Analog clock');
    function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); s.appendChild(e); return e; }
    el('circle', { cx: 100, cy: 100, r: 94, fill: '#14123a', stroke: '#3ef0ff', 'stroke-width': 4 });
    var i;
    for (i = 1; i <= 12; i++) {
      var a = i * Math.PI / 6, t = el('text', { x: 100 + 74 * Math.sin(a), y: 100 - 74 * Math.cos(a) + 5, 'text-anchor': 'middle', 'font-size': 15, fill: '#e9e8ff', 'font-family': 'monospace' });
      t.textContent = i;
    }
    for (i = 0; i < 60; i++) { var b = i * Math.PI / 30, r1 = i % 5 ? 88 : 84; el('line', { x1: 100 + r1 * Math.sin(b), y1: 100 - r1 * Math.cos(b), x2: 100 + 91 * Math.sin(b), y2: 100 - 91 * Math.cos(b), stroke: '#7a79bb', 'stroke-width': i % 5 ? 1 : 2 }); }
    var ha = ((hh % 12) * 30 + mm * 0.5) * Math.PI / 180, ma = mm * 6 * Math.PI / 180;
    el('line', { x1: 100, y1: 100, x2: 100 + 44 * Math.sin(ha), y2: 100 - 44 * Math.cos(ha), stroke: '#ffc83d', 'stroke-width': 7, 'stroke-linecap': 'round' });
    el('line', { x1: 100, y1: 100, x2: 100 + 66 * Math.sin(ma), y2: 100 - 66 * Math.cos(ma), stroke: '#ff7be8', 'stroke-width': 4, 'stroke-linecap': 'round' });
    el('circle', { cx: 100, cy: 100, r: 5, fill: '#e9e8ff' });
    return s;
  }
  function tstr(h12, m) { return h12 + ':' + ('0' + m).slice(-2); }
  K.reg({ id: 'clock', subject: 'math', title: 'CLOCK AND TIME', desc: 'Read the clock and set the clock', emoji: '🕒', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: 'Hours and half hours', value: 1 }, { label: 'MEDIUM', sub: 'Every 5 minutes', value: 2 }, { label: 'HARD', sub: 'Any minute', value: 3 }], function (lv) {
      function rt() { return { h: R(1, 12), m: lv === 1 ? K.pick([0, 30]) : lv === 2 ? R(0, 11) * 5 : R(0, 59) }; }
      K.quiz(box, ctx, { total: 8, delay: 800, make: function (i) {
        var t = rt();
        if (i % 2 === 0) return { build: function (stage, done) {
          stage.appendChild(h('div', 'ksub', 'What time is it?'));
          stage.appendChild(clockSvg(t.h, t.m));
          var set = {}; set[tstr(t.h, t.m)] = 1; var n = 0;
          while (Object.keys(set).length < 4 && n++ < 60) { var o = rt(); if (Math.random() < 0.4) o.h = t.h; set[tstr(o.h, o.m)] = 1; }
          var labs = K.shuffle(Object.keys(set));
          K.choices(stage, labs, labs.indexOf(tstr(t.h, t.m)), done);
        } };
        return { build: function (stage, done) {
          var cur = { h: 12, m: 0 }, holder = h('div'), lab = h('div', 'kbig', tstr(t.h, t.m));
          stage.appendChild(h('div', 'ksub', 'Set the clock to'));
          stage.appendChild(lab); stage.appendChild(holder);
          function paint() { holder.textContent = ''; holder.appendChild(clockSvg(cur.h, cur.m)); }
          paint();
          var row = h('div', 'krow'), ms = lv === 1 ? [30] : lv === 2 ? [5] : [1, 5];
          row.appendChild(K.btn('HOUR -', '', function () { cur.h = cur.h === 1 ? 12 : cur.h - 1; paint(); }));
          row.appendChild(K.btn('HOUR +', '', function () { cur.h = cur.h === 12 ? 1 : cur.h + 1; paint(); }));
          ms.forEach(function (s) {
            row.appendChild(K.btn('MIN -' + s, '', function () { cur.m = (cur.m - s + 60) % 60; paint(); }));
            row.appendChild(K.btn('MIN +' + s, '', function () { cur.m = (cur.m + s) % 60; paint(); }));
          });
          stage.appendChild(row);
          stage.appendChild(K.btn('CHECK', 'go', function () {
            var ok = cur.h === t.h && cur.m === t.m;
            done(ok, ok ? 'YES! ' + tstr(t.h, t.m) + '.' : 'THAT CLOCK SAYS ' + tstr(cur.h, cur.m) + '. WE WANTED ' + tstr(t.h, t.m) + '.');
          }));
        } };
      } });
    });
  } });

  /* ---------- number line hop ---------- */
  K.reg({ id: 'hop', subject: 'math', title: 'NUMBER LINE HOP', desc: 'Hop the frog to the answer', emoji: '🐸', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: 'Numbers to 10', value: { max: 10, step: 1 } }, { label: 'MEDIUM', sub: 'Numbers to 20', value: { max: 20, step: 1 } }, { label: 'HARD', sub: 'Tens to 100', value: { max: 100, step: 10 } }], function (cfg) {
      var cells = cfg.max / cfg.step;
      K.quiz(box, ctx, { total: 8, delay: 900, make: function () {
        var add = Math.random() < 0.5, a, b, ans;
        if (add) { ans = R(2, cells); a = R(0, ans - 1); b = ans - a; } else { a = R(2, cells); b = R(1, a); ans = a - b; }
        var A = a * cfg.step, B = b * cfg.step, ANS = ans * cfg.step;
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kbig', A + (add ? ' + ' : ' - ') + B + ' = ?'));
          stage.appendChild(h('div', 'ksub', 'Tap the number where the frog lands.'));
          var line = h('div', 'kline'), btns = [], pos = a, locked = false, i;
          function frog(j) { btns.forEach(function (x) { var f = x.querySelector('.fr'); if (f) f.remove(); }); btns[j].appendChild(h('span', 'fr', '🐸')); }
          for (i = 0; i <= cells; i++) {
            (function (i) {
              var bt = h('button', i === a ? 's' : '', String(i * cfg.step)); bt.type = 'button';
              bt.addEventListener('click', function () { if (!locked) hopTo(i); });
              line.appendChild(bt); btns.push(bt);
            })(i);
          }
          frog(a); stage.appendChild(line);
          function hopTo(target) {
            locked = true; var dir = target >= pos ? 1 : -1, tok = K.token;
            (function step() {
              if (tok !== K.token) return;
              if (pos === target) {
                var ok = target === ans; btns[target].classList.add('on');
                done(ok, ok ? 'YES! ' + A + (add ? ' + ' : ' - ') + B + ' = ' + ANS + '.' : 'START AT ' + A + ' AND HOP ' + B + (add ? ' TO THE RIGHT' : ' BACK') + '. IT LANDS ON ' + ANS + '.');
                if (!ok) frog(ans);
                return;
              }
              pos += dir; frog(pos); setTimeout(step, 140);
            })();
          }
        } };
      } });
    });
  } });
})();
