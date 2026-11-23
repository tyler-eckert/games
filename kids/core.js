/* Kids app core: screens, menus, stars, shared quiz loop, number pad and on-screen keyboard. */
(function () {
  'use strict';
  var K = window.Kids = { games: [], root: null, token: 0 };
  K.subjects = [
    { id: 'math', name: 'MATH', emoji: '🔢', color: '#3ef0ff', sub: 'Add, subtract, times, clocks, money' },
    { id: 'read', name: 'READING AND LANGUAGE', emoji: '📖', color: '#ff7be8', sub: 'Build words and spell them' },
    { id: 'sci', name: 'SCIENCE AND GENERAL', emoji: '🔬', color: '#7dff6b', sub: 'States, capitals, sorting' },
    { id: 'family', name: 'FAMILY', emoji: '🏠', color: '#ffc83d', sub: 'Phone numbers and address' }
  ];
  K.h = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  K.btn = function (label, cls, fn) {
    var b = K.h('button', 'kbtn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (fn) b.addEventListener('click', fn);
    return b;
  };
  K.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  K.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  K.shuffle = function (arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  /* stars: best result per game, kept on this device */
  var SK = 'arcade.kids.stars';
  function readStars() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch (e) { return {}; } }
  K.getStars = function (id) { return readStars()[id] || 0; };
  K.setStars = function (id, n) {
    var s = readStars();
    if (n > (s[id] || 0)) { s[id] = n; try { localStorage.setItem(SK, JSON.stringify(s)); } catch (e) {} }
  };
  K.totalStars = function () { var s = readStars(), t = 0; for (var k in s) t += s[k]; return t; };
  K.starText = function (n) { return n ? '★'.repeat(n) : ''; };

  /* screens */
  K.screen = function (title, sub, back) {
    K.token++;
    var r = K.root;
    r.textContent = '';
    var bar = K.h('div', 'kbar');
    if (typeof back === 'string') { var a = K.h('a', 'menu', '< BACK'); a.href = back; bar.appendChild(a); }
    else { var b = K.h('button', 'menu', '< BACK'); b.type = 'button'; b.addEventListener('click', back); bar.appendChild(b); }
    bar.appendChild(K.h('span', 'tot', '★ ' + K.totalStars()));
    r.appendChild(bar);
    if (title) r.appendChild(K.h('h1', 'ktitle', title));
    if (sub) r.appendChild(K.h('p', 'ksub', sub));
    var body = K.h('div', 'kbody');
    r.appendChild(body);
    return body;
  };
  K.reg = function (g) { K.games.push(g); };
  K.home = function () {
    var body = K.screen('KIDS', 'Pick a subject', '../');
    K.subjects.forEach(function (s) {
      var c = K.h('button', 'kcard');
      c.type = 'button';
      c.style.setProperty('--c', s.color);
      c.innerHTML = '<span class="em"></span><span class="nm"></span>';
      c.firstChild.textContent = s.emoji;
      c.lastChild.textContent = s.name;
      var sm = K.h('small', '', s.sub); c.lastChild.appendChild(sm);
      c.addEventListener('click', function () { K.subject(s.id); });
      body.appendChild(c);
    });
  };
  K.subject = function (id) {
    var s = K.subjects.filter(function (x) { return x.id === id; })[0];
    var body = K.screen(s.name, 'Pick a game', K.home);
    K.games.filter(function (g) { return g.subject === id; }).forEach(function (g) {
      var c = K.h('button', 'kcard');
      c.type = 'button';
      c.style.setProperty('--c', s.color);
      c.innerHTML = '<span class="em"></span><span class="nm"></span><span class="st"></span>';
      c.firstChild.textContent = g.emoji;
      c.childNodes[1].textContent = g.title;
      c.childNodes[1].appendChild(K.h('small', '', g.desc));
      c.lastChild.textContent = K.starText(K.getStars(g.id));
      c.addEventListener('click', function () { K.launch(g); });
      body.appendChild(c);
    });
  };
  K.launch = function (g) {
    if (window.Auth && Auth.play) Auth.play('kids-' + g.id, { now: true });
    var body = K.screen(g.title, g.desc, function () { K.subject(g.subject); });
    g.run(body, { again: function () { K.launch(g); }, menu: function () { K.subject(g.subject); }, game: g });
  };

  /* pick a level, then call start(value) */
  K.levels = function (box, opts, start) {
    box.textContent = '';
    box.appendChild(K.h('p', 'ksub', 'Choose a level'));
    opts.forEach(function (o) {
      var c = K.h('button', 'kcard'); c.type = 'button';
      c.innerHTML = '<span class="nm"></span>';
      c.firstChild.textContent = o.label;
      c.firstChild.appendChild(K.h('small', '', o.sub || ''));
      c.addEventListener('click', function () { start(o.value); });
      box.appendChild(c);
    });
  };

  /* shared quiz loop. cfg: { id, total, retry, delay, hud(st), make(i, st) -> { build(stage, done(ok, msg)) } } */
  K.quiz = function (box, ctx, cfg) {
    var tok = K.token;
    var st = { i: 0, right: 0, wrong: 0, total: cfg.total, queue: [] };
    box.textContent = '';
    var prog = K.h('div', 'kprog'), stage = K.h('div', 'kstage'), fb = K.h('div', 'kfb'), nx = K.btn('NEXT', 'go');
    nx.hidden = true;
    box.appendChild(prog); box.appendChild(stage); box.appendChild(fb); box.appendChild(nx);
    function hud() { prog.textContent = cfg.hud ? cfg.hud(st) : 'QUESTION ' + Math.min(st.i + 1, st.total) + ' OF ' + st.total; }
    function next() {
      if (tok !== K.token) return;
      if (st.i >= st.total) return end();
      hud(); fb.textContent = ''; fb.className = 'kfb'; nx.hidden = true; stage.textContent = '';
      var q = st.queue.length ? st.queue.shift() : cfg.make(st.i, st), locked = false;
      q.build(stage, function (ok, msg) {
        if (locked || tok !== K.token) return;
        locked = true; st.i++;
        if (ok) st.right++;
        else { st.wrong++; if (cfg.retry && st.total < cfg.total + 6) { st.queue.push(q); st.total++; } }
        fb.textContent = msg || (ok ? 'YES!' : 'NOT QUITE.');
        fb.className = 'kfb ' + (ok ? 'ok' : 'bad');
        hud();
        if (ok) setTimeout(next, cfg.delay || 900);
        else { nx.hidden = false; nx.focus(); }
      });
    }
    nx.addEventListener('click', next);
    function end() {
      var acc = st.right / Math.max(1, st.right + st.wrong);
      var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
      K.setStars(ctx.game.id, stars);
      box.textContent = '';
      box.appendChild(K.h('h2', 'ktitle', stars === 3 ? 'AMAZING!' : stars ? 'NICE WORK!' : 'KEEP PRACTICING'));
      var s = K.h('div', 'kstars'); s.setAttribute('aria-label', stars + ' of 3 stars');
      for (var i = 0; i < 3; i++) { var x = K.h('span', '', '★'); if (i >= stars) x.style.color = '#2b2a5c'; s.appendChild(x); }
      box.appendChild(s);
      box.appendChild(K.h('p', 'ksub', st.right + ' right, ' + st.wrong + ' missed'));
      box.appendChild(K.btn('PLAY AGAIN', 'go', ctx.again));
      box.appendChild(K.btn('MENU', '', ctx.menu));
    }
    next();
  };

  /* four-choice answer buttons */
  K.choices = function (stage, labels, correct, done, explain) {
    var wrap = K.h('div', 'kchoices'), locked = false;
    labels.forEach(function (l, i) {
      var b = K.btn(l, '', function () {
        if (locked) return; locked = true;
        b.classList.add(i === correct ? 'right' : 'wrong');
        if (i !== correct) wrap.children[correct].classList.add('right');
        done(i === correct, i === correct ? 'YES!' : (explain || 'THE ANSWER IS ' + labels[correct] + '.'));
      });
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
  };

  /* number pad: digits only. check(valueString) */
  K.numpad = function (stage, opts, done) {
    var val = '', locked = false, max = opts.max || 4;
    var d = K.h('div', 'kdisp', ' ');
    d.setAttribute('aria-live', 'polite');
    var pad = K.h('div', 'kpad');
    function show() { d.textContent = opts.fmt ? opts.fmt(val) : (val || ' '); }
    show();
    function press(k) {
      if (locked) return;
      if (k === 'bk') val = val.slice(0, -1);
      else if (k === 'ok') {
        if (!val || (opts.min && val.length < opts.min)) { d.classList.add('shake'); setTimeout(function () { d.classList.remove('shake'); }, 300); return; }
        locked = true; var ok = opts.check(val);
        done(ok, ok ? 'YES!' : (opts.wrong ? opts.wrong(val) : 'NOT QUITE.')); return;
      } else if (val.length < max) val += k;
      show();
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bk', '0', 'ok'].forEach(function (k) {
      var b = K.h('button', k === 'ok' ? 'ok' : k === 'bk' ? 'bk' : '', k === 'ok' ? 'GO' : k === 'bk' ? 'DEL' : k);
      b.type = 'button'; if (k === 'ok' || k === 'bk') b.style.fontSize = '11px';
      b.addEventListener('click', function () { press(k); });
      pad.appendChild(b);
    });
    stage.appendChild(d); stage.appendChild(pad);
  };

  /* on-screen keyboard. check(typed) */
  K.typer = function (stage, opts, done) {
    var val = '', locked = false, max = opts.max || 40;
    var d = K.h('div', 'kdisp', ' ');
    d.style.minWidth = '260px'; d.style.fontSize = '16px';
    var kb = K.h('div', 'kkb');
    function show() { d.textContent = val || ' '; }
    function press(k) {
      if (locked) return;
      if (k === 'bk') val = val.slice(0, -1);
      else if (k === 'ok') {
        if (!val.trim()) return;
        locked = true; var ok = opts.check(val); done(ok, ok ? 'YES!' : (opts.wrong ? opts.wrong(val) : 'NOT QUITE.')); return;
      } else if (val.length < max) val += k;
      show();
    }
    var rows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    if (!opts.digits) rows.shift();
    rows.forEach(function (r) {
      var row = K.h('div');
      r.split('').forEach(function (ch) {
        var b = K.h('button', '', ch); b.type = 'button';
        b.addEventListener('click', function () { press(opts.lower ? ch.toLowerCase() : ch); });
        row.appendChild(b);
      });
      kb.appendChild(row);
    });
    var last = K.h('div');
    var bk = K.h('button', 'bk', 'DEL'); bk.type = 'button'; bk.style.fontSize = '9px'; bk.addEventListener('click', function () { press('bk'); });
    last.appendChild(bk);
    if (opts.space) { var sp = K.h('button', 'w', 'SPACE'); sp.type = 'button'; sp.style.fontSize = '9px'; sp.addEventListener('click', function () { press(' '); }); last.appendChild(sp); }
    var ok = K.h('button', 'ok', 'GO'); ok.type = 'button'; ok.style.fontSize = '9px'; ok.addEventListener('click', function () { press('ok'); });
    last.appendChild(ok);
    kb.appendChild(last);
    stage.appendChild(d); stage.appendChild(kb);
  };

  K.speak = function (text) {
    try {
      if (!('speechSynthesis' in window)) return false;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.rate = 0.8; window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  };

  /* access: these logins may open Kids; only the editors may change spelling words and family questions.
     The same rules are enforced in the database (table public.kids_content, row level security). */
  var ALLOW = ['c07d695d-b2b8-4cf4-8b9c-3740e6b397d0', '474dbbe0-1c6c-4629-873b-83ec3dfa7a50', 'c93b19a4-f39c-49b5-b52b-fda6df8e08c9', 'ed0fffa8-a785-4025-a774-371b0955ce48'];
  var EDIT = ['c93b19a4-f39c-49b5-b52b-fda6df8e08c9', 'ed0fffa8-a785-4025-a774-371b0955ce48'];
  K.uid = null;
  K.canEdit = function () { return EDIT.indexOf(K.uid) > -1; };
  K.content = { family: null, spelling: null };
  var CK = 'arcade.kids.content';
  K.loadContent = function () {
    function cached() { try { var c = JSON.parse(localStorage.getItem(CK)); if (c && c.uid === K.uid) K.content = c.content; } catch (e) {} }
    if (!window.Auth || !Auth.client || !navigator.onLine) { cached(); return Promise.resolve(); }
    return Auth.client.from('kids_content').select('key,data').then(function (r) {
      if (r.error) throw r.error;
      var c = { family: null, spelling: null };
      (r.data || []).forEach(function (row) { c[row.key] = row.data; });
      K.content = c;
      try { localStorage.setItem(CK, JSON.stringify({ uid: K.uid, content: c })); } catch (e) {}
    }).catch(cached);
  };
  K.saveContent = function (key, data) {
    if (!K.canEdit()) return Promise.resolve({ error: { message: 'Only parents can change this.' } });
    return Auth.client.from('kids_content').upsert({ key: key, data: data, updated_at: new Date().toISOString(), updated_by: K.uid }).then(function (r) {
      if (!r.error) {
        K.content[key] = data;
        try { localStorage.setItem(CK, JSON.stringify({ uid: K.uid, content: K.content })); } catch (e) {}
      }
      return r;
    });
  };
  K.denied = function () {
    K.root.textContent = '';
    K.root.appendChild(K.h('h1', 'ktitle', 'KIDS'));
    K.root.appendChild(K.h('p', 'ksub', 'This part of the arcade is not turned on for this login.'));
    var a = K.h('a', 'kbtn', 'BACK TO ARCADE'); a.href = '../'; a.style.textAlign = 'center';
    K.root.appendChild(a);
  };

  window.addEventListener('DOMContentLoaded', function () {
    K.root = document.getElementById('app');
    if (!window.Auth || !Auth.require) { K.home(); return; }   // local build with no sign-in
    Auth.require().then(function (s) {
      if (!s) return;
      K.uid = s.user && s.user.id;
      if (ALLOW.indexOf(K.uid) < 0) return K.denied();
      return K.loadContent().then(K.home);
    });
  });
})();
