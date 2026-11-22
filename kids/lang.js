/* Kids: reading and language games. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  var BUILD = {
    1: [['CAT', '🐱'], ['DOG', '🐶'], ['SUN', '☀️'], ['PIG', '🐷'], ['COW', '🐮'], ['BEE', '🐝'], ['FOX', '🦊'], ['HEN', '🐔'], ['KEY', '🔑'], ['BUS', '🚌'], ['BED', '🛏️'], ['HAT', '🎩']],
    2: [['FROG', '🐸'], ['DUCK', '🦆'], ['FISH', '🐟'], ['STAR', '⭐'], ['MOON', '🌙'], ['TREE', '🌳'], ['CAKE', '🎂'], ['BEAR', '🐻'], ['LION', '🦁'], ['BIRD', '🐦'], ['BOAT', '⛵'], ['BOOK', '📖'], ['APPLE', '🍎'], ['HORSE', '🐴'], ['CLOCK', '🕒'], ['HOUSE', '🏠']],
    3: [['RABBIT', '🐰'], ['MONKEY', '🐒'], ['FLOWER', '🌸'], ['ROCKET', '🚀'], ['PLANET', '🪐'], ['PENCIL', '✏️'], ['CASTLE', '🏰'], ['DRAGON', '🐉'], ['TURTLE', '🐢'], ['GUITAR', '🎸'], ['BICYCLE', '🚲'], ['ELEPHANT', '🐘']]
  };
  K.reg({ id: 'builder', subject: 'read', title: 'WORD BUILDER', desc: 'Tap the letters to spell the picture', emoji: '🧱', run: function (box, ctx) {
    K.levels(box, [{ label: 'EASY', sub: '3-letter words', value: 1 }, { label: 'MEDIUM', sub: '4 and 5 letters', value: 2 }, { label: 'HARD', sub: '6 letters and up', value: 3 }], function (lv) {
      var words = K.shuffle(BUILD[lv]);
      K.quiz(box, ctx, { total: 8, delay: 900, make: function (i) {
        var pair = words[i % words.length], w = pair[0];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kemoji', pair[1]));
          var slots = h('div', 'kslots'), bank = h('div', 'kslots'), msg = h('div', 'ksub', 'Spell it'), tries = 0;
          var letters = K.shuffle(w.split('')), placed = [], tiles = [];
          var sl = [];
          for (var s = 0; s < w.length; s++) { var d = h('button', 'kslot', ' '); d.type = 'button'; slots.appendChild(d); sl.push(d); }
          function paint() {
            sl.forEach(function (d, j) { d.textContent = placed[j] ? placed[j].ch : ' '; });
            tiles.forEach(function (t) { t.el.classList.toggle('used', t.used); });
          }
          sl.forEach(function (d, j) { d.addEventListener('click', function () { if (placed[j]) { placed[j].t.used = false; placed.splice(j, 1); paint(); } }); });
          letters.forEach(function (ch) {
            var el = h('button', 'ktile', ch); el.type = 'button';
            var t = { ch: ch, el: el, used: false }; tiles.push(t);
            el.addEventListener('click', function () {
              if (t.used || placed.length >= w.length) return;
              t.used = true; placed.push({ ch: ch, t: t }); paint();
              if (placed.length === w.length) check();
            });
            bank.appendChild(el);
          });
          function check() {
            var got = placed.map(function (p) { return p.ch; }).join('');
            if (got === w) { done(true, 'YES! ' + w + '.'); return; }
            tries++;
            if (tries >= 2) { done(false, 'IT SPELLS ' + w + '.'); return; }
            slots.classList.add('shake'); msg.textContent = 'Not quite. Try again.';
            setTimeout(function () { slots.classList.remove('shake'); placed = []; tiles.forEach(function (t) { t.used = false; }); paint(); }, 500);
          }
          stage.appendChild(slots); stage.appendChild(msg); stage.appendChild(bank);
        } };
      } });
    });
  } });

  /* ---------- spelling bee ---------- */
  var SPELL = {
    1: ['the', 'and', 'said', 'with', 'they', 'have', 'were', 'what', 'when', 'play', 'jump', 'little', 'friend', 'school', 'water', 'please'],
    2: ['because', 'people', 'before', 'again', 'always', 'around', 'would', 'could', 'enough', 'family', 'animal', 'together', 'garden', 'morning', 'favorite', 'house'],
    3: ['different', 'special', 'beautiful', 'thought', 'through', 'important', 'surprise', 'library', 'answer', 'country', 'probably', 'exercise', 'February', 'neighbor', 'science', 'picture']
  };
  function myList() { var d = K.content.spelling; return d && d.words ? d.words : []; }
  K.reg({ id: 'spell', subject: 'read', title: 'SPELLING BEE', desc: 'Hear it, spell it. Add your own list', emoji: '🐝', run: function (box, ctx) {
    var mine = myList(), opts = [{ label: 'GRADE 1', sub: 'Sight words', value: 1 }, { label: 'GRADE 2', sub: 'Everyday words', value: 2 }, { label: 'GRADE 3', sub: 'Tricky words', value: 3 }];
    if (mine.length) opts.push({ label: 'MY LIST', sub: mine.length + ' words from school', value: 'mine' });
    K.levels(box, opts, play);
    if (K.canEdit()) box.appendChild(K.btn('EDIT MY SPELLING LIST', '', edit));
    function edit() {
      box.textContent = '';
      box.appendChild(h('p', 'ksub', 'One word per line, or separate with commas. Shared with every kid login.'));
      var err = h('div', 'kfb bad');
      var ta = h('textarea', 'kin'); ta.rows = 10; ta.value = myList().join('\n'); ta.setAttribute('aria-label', 'Spelling words');
      box.appendChild(ta);
      box.appendChild(K.btn('SAVE', 'go', function () {
        var ws = ta.value.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(function (s) { return /^[A-Za-z' -]+$/.test(s); });
        K.saveContent('spelling', { words: ws }).then(function (r) { if (r && r.error) err.textContent = 'COULD NOT SAVE. ' + (navigator.onLine ? '' : 'YOU ARE OFFLINE.'); else ctx.again(); });
      }));
      box.appendChild(err);
      box.appendChild(K.btn('CANCEL', '', ctx.again));
    }
    function play(v) {
      var list = K.shuffle(v === 'mine' ? mine : SPELL[v]);
      K.quiz(box, ctx, { total: Math.min(8, list.length), retry: true, delay: 900, make: function (i) {
        var w = list[i % list.length];
        return { build: function (stage, done) {
          var info = h('div', 'ksub', 'Listen, then spell the word.');
          stage.appendChild(info);
          var hear = K.btn('HEAR THE WORD', '', function () { say(); });
          stage.appendChild(hear);
          function say() { if (!K.speak(w)) { info.textContent = w.toUpperCase(); setTimeout(function () { info.textContent = 'Now spell it.'; }, 2200); } }
          setTimeout(say, 250);
          var tries = 0;
          K.typer(stage, { max: 20, space: false, check: function (t) { return t.toLowerCase() === w.toLowerCase().replace(/[^a-z]/g, ''); },
            wrong: function () { return 'THE WORD IS ' + w.toUpperCase() + '. IT COMES BACK.'; } }, done);
        } };
      } });
    }
  } });
})();
