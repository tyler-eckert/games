/* Kids: family quiz. Answers are entered by a parent and stored in the database (kids_content), never in the site's code. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  function read() { return K.content.family || {}; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  var ABBR = { street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', lane: 'ln', court: 'ct', circle: 'cir', boulevard: 'blvd', place: 'pl', north: 'n', south: 's', east: 'e', west: 'w', trail: 'trl', way: 'wy' };
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[.,#]/g, ' ').split(/\s+/).filter(Boolean).map(function (w) { return ABBR[w] || w; }).join(' ');
  }
  function items() {
    var d = read(), out = [];
    if (digits(d.mom)) out.push({ q: "What is Mommy's phone number?", a: d.mom, type: 'phone' });
    if (digits(d.dad)) out.push({ q: "What is Daddy's phone number?", a: d.dad, type: 'phone' });
    if (norm(d.addr)) out.push({ q: 'What is your address?', a: d.addr, type: 'text' });
    (d.extra || []).forEach(function (x) { if (x.q && x.a) out.push({ q: x.q, a: x.a, type: 'text' }); });
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
    if (K.canEdit()) box.appendChild(K.btn('PARENTS: EDIT ANSWERS', '', setup));
    function start() {
      var qs = K.shuffle(list);
      K.quiz(box, ctx, { total: qs.length, retry: true, delay: 1000, make: function (i) {
        var it = qs[i % qs.length];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kbig', it.q));
          stage.lastChild.style.fontSize = '16px';
          if (it.type === 'phone') {
            K.numpad(stage, { max: 11, check: function (v) { return digits(v) === digits(it.a); }, wrong: function () { return 'THE NUMBER IS ' + it.a + '. THIS ONE COMES BACK.'; } }, done);
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
      var d = read(), f = {};
      box.textContent = '';
      box.appendChild(h('p', 'ksub', 'For parents. Saved to the arcade and shared with the kid logins.'));
      function fld(key, label, val, ph) {
        var w = h('label', 'kfld', label), i = h('input', 'kin'); i.value = val || ''; i.placeholder = ph || ''; i.autocomplete = 'off';
        w.appendChild(i); box.appendChild(w); f[key] = i;
      }
      fld('mom', "Mommy's phone number", d.mom, '555-123-4567');
      fld('dad', "Daddy's phone number", d.dad, '555-123-4567');
      fld('addr', 'Home address', d.addr, '123 Main St, City, ST 00000');
      box.appendChild(h('p', 'knote', 'Optional extra questions, like "What is our dog\'s name?"'));
      var ex = d.extra || [], ef = [];
      for (var n = 0; n < 3; n++) {
        (function (n) {
          var q = h('input', 'kin'), a = h('input', 'kin');
          q.placeholder = 'Question ' + (n + 1); a.placeholder = 'Answer'; q.value = (ex[n] && ex[n].q) || ''; a.value = (ex[n] && ex[n].a) || '';
          q.autocomplete = a.autocomplete = 'off';
          box.appendChild(q); box.appendChild(a); ef.push([q, a]);
        })(n);
      }
      var err = h('div', 'kfb bad');
      box.appendChild(K.btn('SAVE', 'go', function () {
        var out = { mom: f.mom.value.trim(), dad: f.dad.value.trim(), addr: f.addr.value.trim(), extra: ef.map(function (p) { return { q: p[0].value.trim(), a: p[1].value.trim() }; }).filter(function (x) { return x.q && x.a; }) };
        K.saveContent('family', out).then(function (r) { if (r && r.error) err.textContent = 'COULD NOT SAVE. ' + (navigator.onLine ? '' : 'YOU ARE OFFLINE.'); else ctx.again(); });
      }));
      box.appendChild(err);
      box.appendChild(K.btn('CANCEL', '', ctx.menu));
    }
  } });
})();
