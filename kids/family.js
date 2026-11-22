/* Kids: family quiz. Answers are entered by a parent and stored in the database (kids_content), never in the site's code. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  var DATE_ORDER = 'md';   // 'md' = month/day/year (US), 'dm' = day/month/year. Change this one word to flip every date question.
  var MAX_EXTRA = 40;
  function read() { return K.content.family || {}; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  var ABBR = { street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', lane: 'ln', court: 'ct', circle: 'cir', boulevard: 'blvd', place: 'pl', north: 'n', south: 's', east: 'e', west: 'w', trail: 'trl', way: 'wy' };
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[.,#]/g, ' ').split(/\s+/).filter(Boolean).map(function (w) { return ABBR[w] || w; }).join(' ');
  }
  /* "3/5/2016" -> {m:3,d:5,y:2016} using DATE_ORDER. Accepts / - . or spaces; a two-digit year is read as 20xx below 50, else 19xx. */
  function parseDate(s) {
    var m = /^\s*(\d{1,2})\D+(\d{1,2})\D+(\d{4}|\d{2})\s*$/.exec(String(s || ''));
    if (!m) return null;
    var a = +m[1], b = +m[2], y = +m[3];
    if (m[3].length === 2) y += y < 50 ? 2000 : 1900;
    var mo = DATE_ORDER === 'md' ? a : b, d = DATE_ORDER === 'md' ? b : a;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { m: mo, d: d, y: y };
  }
  function showDate(p) { return (DATE_ORDER === 'md' ? p.m + '/' + p.d : p.d + '/' + p.m) + '/' + p.y; }
  function maskDate(v) {   // "03052016" -> "03/05/2016", empty slots shown as underscores
    function seg(from, len) { var s = v.slice(from, from + len); while (s.length < len) s += '_'; return s; }
    return seg(0, 2) + ' / ' + seg(2, 2) + ' / ' + seg(4, 4);
  }
  function items() {
    var d = read(), out = [];
    if (digits(d.mom)) out.push({ q: "What is Mommy's phone number?", a: d.mom, type: 'phone' });
    if (digits(d.dad)) out.push({ q: "What is Daddy's phone number?", a: d.dad, type: 'phone' });
    if (norm(d.addr)) out.push({ q: 'What is your address?', a: d.addr, type: 'text' });
    (d.extra || []).forEach(function (x) {
      if (!x.q || !x.a) return;
      var t = x.t || (parseDate(x.a) ? 'date' : 'text');
      if (t === 'date' && !parseDate(x.a)) t = 'text';
      out.push({ q: x.q, a: x.a, type: t });
    });
    return out;
  }
  K.reg({ id: 'family', subject: 'family', title: 'FAMILY QUIZ', desc: 'Phone numbers, address and more', emoji: '📞', run: function (box, ctx) {
    var list = items();
    if (!list.length) {
      if (K.canEdit()) return setup();
      box.appendChild(h('p', 'ksub', 'No questions yet. Ask a parent to set them up.'));
      return;
    }
    box.textContent = '';
    box.appendChild(h('p', 'ksub', 'Ready? Misses come back until you know them.'));
    box.appendChild(K.btn('START', 'go', start));
    if (K.canEdit()) box.appendChild(K.btn('PARENTS: EDIT QUESTIONS', '', setup));
    function start() {
      var qs = K.shuffle(list);
      K.quiz(box, ctx, { total: qs.length, retry: true, delay: 1000, make: function (i) {
        var it = qs[i % qs.length];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kbig', it.q));
          stage.lastChild.style.fontSize = '16px';
          if (it.type === 'phone') {
            K.numpad(stage, { max: 11, check: function (v) { return digits(v) === digits(it.a); }, wrong: function () { return 'THE NUMBER IS ' + it.a + '. THIS ONE COMES BACK.'; } }, done);
          } else if (it.type === 'date') {
            var p = parseDate(it.a);
            stage.appendChild(h('div', 'knote', (DATE_ORDER === 'md' ? 'MONTH / DAY / YEAR' : 'DAY / MONTH / YEAR') + '. USE 2 NUMBERS FOR THE FIRST TWO, LIKE 03.'));
            K.numpad(stage, { max: 8, min: 8, fmt: maskDate, check: function (v) {
              var a = +v.slice(0, 2), b = +v.slice(2, 4), y = +v.slice(4);
              var mo = DATE_ORDER === 'md' ? a : b, d = DATE_ORDER === 'md' ? b : a;
              return mo === p.m && d === p.d && y === p.y;
            }, wrong: function () { return 'THE DATE IS ' + showDate(p) + '. THIS ONE COMES BACK.'; } }, done);
          } else {
            K.typer(stage, { digits: true, space: true, max: 60, check: function (v) {
              var t = norm(v), a = norm(it.a), first = norm(String(it.a).split(',')[0]);
              return t === a || t === first;
            }, wrong: function () { return 'THE ANSWER IS ' + it.a.toUpperCase() + '. THIS ONE COMES BACK.'; } }, done);
          }
        } };
      } });
    }
    function setup() {
      var d = read(), f = {}, rows = [];
      box.textContent = '';
      box.appendChild(h('p', 'ksub', 'For parents. Saved to the arcade and shared with the kid logins.'));
      function fld(key, label, val, ph) {
        var w = h('label', 'kfld', label), i = h('input', 'kin'); i.value = val || ''; i.placeholder = ph || ''; i.autocomplete = 'off';
        w.appendChild(i); box.appendChild(w); f[key] = i;
      }
      fld('mom', "Mommy's phone number", d.mom, '555-123-4567');
      fld('dad', "Daddy's phone number", d.dad, '555-123-4567');
      fld('addr', 'Home address', d.addr, '123 Main St, City, ST 00000');
      box.appendChild(h('p', 'knote', 'MORE QUESTIONS. PICK WORD FOR NAMES, PHONE FOR NUMBERS, DATE FOR BIRTHDAYS.'));
      var holder = h('div', 'kqlist'); box.appendChild(holder);
      var datePh = DATE_ORDER === 'md' ? 'm/d/yyyy' : 'd/m/yyyy';
      function addRow(q, a, t) {
        if (rows.length >= MAX_EXTRA) return;
        var wrap = h('div', 'kqrow'), qi = h('input', 'kin'), ai = h('input', 'kin'), sel = h('select', 'kin');
        qi.placeholder = 'Question'; qi.value = q || ''; qi.autocomplete = 'off'; qi.setAttribute('aria-label', 'Question');
        ai.value = a || ''; ai.autocomplete = 'off'; ai.setAttribute('aria-label', 'Answer');
        [['text', 'WORD ANSWER'], ['phone', 'PHONE NUMBER'], ['date', 'DATE (' + datePh.toUpperCase() + ')']].forEach(function (o) {
          var op = h('option', '', o[1]); op.value = o[0]; sel.appendChild(op);
        });
        sel.value = t || (parseDate(a) ? 'date' : 'text'); sel.setAttribute('aria-label', 'Answer type');
        function ph() { ai.placeholder = sel.value === 'date' ? datePh : sel.value === 'phone' ? '555-123-4567' : 'Answer'; }
        sel.addEventListener('change', ph); ph();
        var rm = h('button', 'kbtn', 'REMOVE'); rm.type = 'button'; rm.style.fontSize = '8px';
        var row = { wrap: wrap, q: qi, a: ai, t: sel };
        rm.addEventListener('click', function () { rows.splice(rows.indexOf(row), 1); wrap.remove(); });
        wrap.appendChild(qi); wrap.appendChild(ai); wrap.appendChild(sel); wrap.appendChild(rm);
        holder.appendChild(wrap); rows.push(row);
        return row;
      }
      var ex = d.extra || [];
      ex.forEach(function (x) { addRow(x.q, x.a, x.t); });
      if (!ex.length) addRow('', '', 'text');
      box.appendChild(K.btn('+ ADD A QUESTION', '', function () { var r = addRow('', '', 'text'); if (r) r.q.focus(); }));
      var err = h('div', 'kfb bad');
      box.appendChild(K.btn('SAVE', 'go', function () {
        err.textContent = '';
        var extra = [], bad = null;
        rows.forEach(function (r) {
          var q = r.q.value.trim(), a = r.a.value.trim(), t = r.t.value;
          if (!q && !a) return;
          if (!q || !a) { bad = bad || 'EVERY QUESTION NEEDS AN ANSWER.'; return; }
          if (t === 'date') {
            var p = parseDate(a);
            if (!p) { bad = bad || 'DATE "' + a.toUpperCase() + '" SHOULD LOOK LIKE ' + datePh.toUpperCase() + '.'; return; }
            a = showDate(p);
          }
          if (t === 'phone' && digits(a).length < 7) { bad = bad || 'PHONE NUMBERS NEED AT LEAST 7 DIGITS.'; return; }
          extra.push({ q: q, a: a, t: t });
        });
        if (bad) { err.textContent = bad; return; }
        var out = { mom: f.mom.value.trim(), dad: f.dad.value.trim(), addr: f.addr.value.trim(), extra: extra };
        K.saveContent('family', out).then(function (r) { if (r && r.error) err.textContent = 'COULD NOT SAVE. ' + (navigator.onLine ? '' : 'YOU ARE OFFLINE.'); else ctx.again(); });
      }));
      box.appendChild(err);
      box.appendChild(K.btn('CANCEL', '', ctx.menu));
    }
  } });
})();
