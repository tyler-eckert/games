(function () {
  var GAME = 'codebreaker';
  var ROWS = 8, LEN = 4;
  var COLORS = [
    { c: '#ff4d5e', t: '#0b0a1f', name: 'red' },
    { c: '#ffc83d', t: '#0b0a1f', name: 'amber' },
    { c: '#7dff6b', t: '#0b0a1f', name: 'green' },
    { c: '#3ef0ff', t: '#0b0a1f', name: 'cyan' },
    { c: '#4d6bff', t: '#ffffff', name: 'blue' },
    { c: '#e86bff', t: '#0b0a1f', name: 'violet' }
  ];

  var secret, guesses, current, status, lastScore, scoreSaved = false;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function grade(sec, guess) {
    var exact = 0, s = [], g = [], near = 0, i;
    for (i = 0; i < LEN; i++) {
      if (sec[i] === guess[i]) exact++;
      else { s.push(sec[i]); g.push(guess[i]); }
    }
    g.forEach(function (x) {
      var k = s.indexOf(x);
      if (k > -1) { near++; s.splice(k, 1); }
    });
    return { exact: exact, near: near };
  }

  function peg(ci, extra) {
    var b = el('button', 'peg' + (extra ? ' ' + extra : ''), String(ci + 1));
    b.type = 'button';
    b.style.setProperty('--c', COLORS[ci].c);
    b.style.setProperty('--t', COLORS[ci].t);
    b.setAttribute('aria-label', COLORS[ci].name + ' ' + (ci + 1));
    return b;
  }

  function fbEls(res) {
    var wrap = el('div', 'fbs');
    wrap.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < LEN; i++) {
      var kind = !res ? 'none' : i < res.exact ? 'exact' : i < res.exact + res.near ? 'near' : 'none';
      wrap.appendChild(el('span', 'fb ' + kind));
    }
    return wrap;
  }

  function render() {
    var board = $('board');
    var over = status !== 'play';
    board.textContent = '';

    // secret row
    var codeRow = el('div', 'row code');
    codeRow.appendChild(el('div', 'num', '?'));
    var cs = el('div', 'slots');
    secret.forEach(function (ci) {
      if (over) { var p = peg(ci); p.disabled = true; cs.appendChild(p); }
      else {
        var h = el('button', 'peg hidden', '?');
        h.type = 'button'; h.disabled = true;
        h.setAttribute('aria-label', 'hidden');
        cs.appendChild(h);
      }
    });
    codeRow.appendChild(cs);
    var blank = el('div', 'fbs');
    for (var b = 0; b < LEN; b++) blank.appendChild(el('span', 'fb blank'));
    codeRow.appendChild(blank);
    board.appendChild(codeRow);

    for (var r = 0; r < ROWS; r++) {
      var submitted = r < guesses.length;
      var active = r === guesses.length && status === 'play';
      var row = el('div', 'row' + (active ? ' active' : ''));
      row.appendChild(el('div', 'num', String(r + 1)));
      var slots = el('div', 'slots');
      for (var i = 0; i < LEN; i++) {
        var node;
        if (submitted) {
          node = peg(guesses[r].code[i]); node.disabled = true;
        } else if (active && i < current.length) {
          node = peg(current[i]);
          node.setAttribute('aria-label', 'Slot ' + (i + 1) + ', ' + COLORS[current[i]].name + ', press to remove');
          node.dataset.slot = i;
        } else {
          node = el('button', 'peg empty'); node.type = 'button'; node.disabled = true;
          node.setAttribute('aria-label', 'Slot ' + (i + 1) + ', empty');
        }
        slots.appendChild(node);
      }
      row.appendChild(slots);
      row.appendChild(fbEls(submitted ? guesses[r] : null));
      board.appendChild(row);
    }

    $('try').textContent = 'TRY ' + Math.min(guesses.length + (over ? 0 : 1), ROWS) + '/' + ROWS;
    $('enter').disabled = over || current.length !== LEN;
  }

  function buildPalette() {
    var pal = $('palette');
    COLORS.forEach(function (_, ci) {
      var p = peg(ci, 'big');
      p.dataset.pick = ci;
      pal.appendChild(p);
    });
  }

  function pick(ci) {
    if (status !== 'play' || current.length >= LEN) return;
    current.push(ci);
    render();
  }
  function del() {
    if (status !== 'play') return;
    current.pop();
    render();
  }
  function submit() {
    if (status !== 'play' || current.length !== LEN) return;
    var res = grade(secret, current);
    guesses.push({ code: current.slice(), exact: res.exact, near: res.near });
    current = [];
    if (res.exact === LEN) status = 'won';
    else if (guesses.length >= ROWS) status = 'lost';
    render();
    if (status !== 'play') showOver();
  }

  function renderTable(highlight) {
    var t = $('table');
    Scores.top(GAME, 5).then(function (list) {
      t.textContent = '';
      if (!list.length) { t.hidden = true; return; }
      list.forEach(function (s, i) {
        var d = el('div', highlight && s.at === highlight ? 'me' : '');
        d.appendChild(el('span', '', (i + 1) + '. ' + s.initials));
        d.appendChild(el('span', '', s.score.toLocaleString()));
        t.appendChild(d);
      });
      t.hidden = false;
    });
  }

  function showOver() {
    var won = status === 'won';
    var tries = guesses.length;
    lastScore = won ? 1000 - (tries - 1) * 100 : 0;
    var title = $('over-title');
    title.textContent = won ? 'CODE CRACKED!' : 'GAME OVER';
    title.style.color = won ? '#7dff6b' : '#ff7b8a';
    title.style.textShadow = '0 0 14px ' + (won ? '#7dff6b' : '#ff7b8a');
    $('over-line').textContent = won ? 'SOLVED IN ' + tries + (tries === 1 ? ' TRY' : ' TRIES') : 'THE CODE IS SHOWN ON THE BOARD';
    $('over-score').textContent = 'SCORE ' + lastScore.toLocaleString();
    scoreSaved = false;
    $('lbLink').href = '/leaderboard.html?game=' + encodeURIComponent(GAME);
    var qualifies = won && lastScore > 0 && Scores.qualifies(GAME, lastScore);
    $('initials').hidden = !qualifies;
    $('again').hidden = qualifies;
    $('table').hidden = true;
    if (!qualifies) renderTable();
    $('over').hidden = false;
    (qualifies ? $('ini') : $('again')).focus();
  }

  function newGame() {
    if (window.Auth && Auth.play) Auth.play('codebreaker');
    secret = [];
    for (var i = 0; i < LEN; i++) secret.push(Math.floor(Math.random() * COLORS.length));
    guesses = []; current = []; status = 'play';
    $('over').hidden = true;
    $('ini').value = '';
    render();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.pick !== undefined) pick(+t.dataset.pick);
    else if (t.dataset.slot !== undefined && status === 'play') {
      current.splice(+t.dataset.slot, 1);
      render();
    }
  });
  $('del').addEventListener('click', del);
  $('enter').addEventListener('click', submit);
  $('again').addEventListener('click', newGame);
  $('initials').addEventListener('submit', function (e) {
    e.preventDefault();
    var ini = $('ini').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!ini || scoreSaved || !(lastScore > 0)) return;
    scoreSaved = true;                       // one save per game, even on repeated taps
    $('initials').hidden = true;
    $('again').hidden = false;
    Scores.submit(GAME, ini, lastScore).then(function () {
      renderTable();
      $('again').focus();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (!$('over').hidden || HowTo.isOpen() || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key >= '1' && e.key <= String(COLORS.length)) pick(+e.key - 1);
    else if (e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') submit();
  });

  var HELP = [
    'A secret code of 4 pegs is hidden. Each peg is one of 6 colors, and colors can repeat.',
    'Tap colors to fill the glowing row, then press ENTER. You get 8 tries. Tap a placed peg to remove it.',
    'After each try: a gold dot means one peg is the right color in the right spot. A cyan ring means the right color in the wrong spot. The dots do not say which peg.',
    'Crack the code in fewer tries to score higher. On a keyboard, use 1 to 6, Backspace and Enter.'
  ];
  $('help').addEventListener('click', function () { HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' }); });

  buildPalette();
  newGame();
  Auth.require().then(function (s) {
    if (s) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
