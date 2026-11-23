(function () {
  var GAME = 'hangman', LIVES = 6;
  var $ = function (id) { return document.getElementById(id); };
  var word, cat, guessed, wrong, score, solved, hintUsed, over, pool = [];

  function pickWord() {
    if (!pool.length) {
      Object.keys(HANGMAN_WORDS).forEach(function (c) {
        HANGMAN_WORDS[c].forEach(function (w) { pool.push([c, w]); });
      });
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
    }
    return pool.pop();
  }
  function newGame() {
    if (window.Auth && Auth.play) Auth.play('hangman');
    score = 0; solved = 0; over = false;
    Endgame.hide();
    nextWord();
  }
  function nextWord() {
    var p = pickWord();
    cat = p[0]; word = p[1];
    guessed = {}; wrong = 0; hintUsed = false;
    setMsg('PICK A LETTER.');
    render();
  }
  function setMsg(t) { $('msg').textContent = t; }
  function complete() {
    return word.split('').every(function (ch) { return guessed[ch]; });
  }
  function guess(L) {
    if (over || guessed[L]) return;
    guessed[L] = true;
    if (word.indexOf(L) > -1) {
      setMsg('YES! ' + L + ' IS IN THE WORD.');
      if (complete()) { win(); return; }
    } else {
      wrong++;
      setMsg('NO ' + L + '. ' + (LIVES - wrong) + ' LEFT.');
      if (wrong >= LIVES) { lose(); return; }
    }
    render();
  }
  function hint() {
    if (over || hintUsed || wrong >= LIVES - 1) return;
    var left = word.split('').filter(function (ch) { return !guessed[ch]; });
    if (!left.length) return;
    var L = left[Math.floor(Math.random() * left.length)];
    hintUsed = true; wrong++;
    guessed[L] = true;
    setMsg('HINT: ' + L + ' IS IN THE WORD.');
    if (complete()) { win(); return; }
    render();
  }
  function win() {
    over = true; solved++;
    var gain = 100 + 25 * (LIVES - wrong) + 10 * word.length;
    score += gain;
    setMsg('SOLVED! +' + gain);
    render();
    var tw = word;
    setTimeout(function () { if (word === tw) { over = false; nextWord(); } }, 1500);
  }
  function lose() {
    over = true;
    word.split('').forEach(function (ch) { if (!guessed[ch]) guessed[ch] = 'miss'; });
    setMsg('THE WORD WAS ' + word + '.');
    render();
    Endgame.show({
      key: GAME, title: 'GAME OVER', color: '#ff7b8a',
      line: solved + (solved === 1 ? ' WORD' : ' WORDS') + ' SOLVED',
      score: score, delay: 1600, onAgain: newGame
    });
  }

  var keysBuilt = false;
  function buildKeys() {
    var k = $('keys');
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.l = L; b.textContent = L;
      b.setAttribute('aria-label', 'Letter ' + L);
      k.appendChild(b);
    });
    keysBuilt = true;
  }
  function render() {
    $('cat').textContent = cat;
    var w = $('word');
    w.textContent = '';
    word.split('').forEach(function (ch) {
      var d = document.createElement('div');
      d.className = 'ltr' + (guessed[ch] === 'miss' ? ' miss' : '');
      d.textContent = guessed[ch] ? ch : '';
      w.appendChild(d);
    });
    w.setAttribute('aria-label', 'Word: ' + word.split('').map(function (ch) { return guessed[ch] ? ch : 'blank'; }).join(' '));
    for (var i = 1; i <= 6; i++) $('p' + i).classList.toggle('on', i <= wrong);
    $('lives').textContent = 'LIVES ' + (LIVES - wrong);
    $('solved').textContent = 'WORDS ' + solved;
    $('score').textContent = score.toLocaleString();
    Array.prototype.forEach.call($('keys').children, function (b) {
      var L = b.dataset.l, g = guessed[L];
      b.disabled = !!g || over;
      b.classList.toggle('hit', !!g && word.indexOf(L) > -1);
      b.classList.toggle('no', !!g && word.indexOf(L) === -1);
    });
    $('hint').disabled = over || hintUsed || wrong >= LIVES - 1;
  }

  $('keys').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-l]');
    if (b && !b.disabled) guess(b.dataset.l);
  });
  $('hint').addEventListener('click', hint);
  document.addEventListener('keydown', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen() || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    var L = e.key.length === 1 ? e.key.toUpperCase() : '';
    if (L >= 'A' && L <= 'Z') guess(L);
  });

  var HELP = [
    'A secret word is hidden. The category is shown at the top.',
    'Tap letters to guess. Right letters appear in the word. Each wrong letter adds a part to the drawing, and 6 wrong guesses ends the game.',
    'Solve a word to earn points. Fewer misses and longer words score more. Then a new word appears with a fresh set of lives.',
    'HINT reveals one letter but costs a life, once per word. You can also type letters on a keyboard.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  buildKeys();
  Auth.require().then(function (s) {
    if (!s) return;
    newGame();
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
