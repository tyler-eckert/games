/* Shared end-of-game dialog: score, initials entry for a high score, top-5 table, play again.
   Endgame.show({ key, title, color, line, score, delay, onAgain }) */
(function () {
  var cur = null, mounted = false;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    var o = document.createElement('div');
    o.className = 'overlay';
    o.id = 'over';
    o.hidden = true;
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-labelledby', 'over-title');
    o.innerHTML =
      '<div class="panel">' +
      '<h2 id="over-title"></h2>' +
      '<div class="line" id="over-line"></div>' +
      '<div class="score" id="over-score"></div>' +
      '<form class="initials" id="initials" hidden>' +
      '<label for="ini">NEW HIGH SCORE! ENTER INITIALS</label>' +
      '<input id="ini" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" required>' +
      '<button class="big-btn" type="submit">SAVE</button>' +
      '</form>' +
      '<div class="table" id="table" hidden></div>' +
      '<div class="endbtns"><button class="big-btn" id="again" type="button">PLAY AGAIN</button>' +
      '<a class="big-btn alt" id="lbLink" href="/leaderboard.html">LEADERBOARD</a></div>' +
      '</div>';
    document.body.appendChild(o);

    $('again').addEventListener('click', function () {
      hide();
      if (cur && cur.onAgain) cur.onAgain();
    });
    $('initials').addEventListener('submit', function (e) {
      e.preventDefault();
      var ini = $('ini').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
      if (!ini || !cur || cur.saved) return;
      cur.saved = true;                       // one save per game, even on double taps
      $('initials').hidden = true;
      $('again').hidden = false;
      Scores.submit(cur.key, ini, cur.score).then(function () {
        renderTable();
        $('again').focus();
      });
    });
  }

  function renderTable() {
    var t = $('table');
    Scores.top(cur.key, 5).then(function (list) {
      t.textContent = '';
      if (!list.length) { t.hidden = true; return; }
      list.forEach(function (s, i) {
        var d = el('div');
        d.appendChild(el('span', '', (i + 1) + '. ' + s.initials));
        d.appendChild(el('span', '', Scores.fmt(cur.key, s.score)));
        t.appendChild(d);
      });
      t.hidden = false;
    });
  }

  function hide() { if ($('over')) $('over').hidden = true; }

  window.Endgame = {
    hide: hide,
    isOpen: function () { return !!$('over') && !$('over').hidden; },
    show: function (o) {
      mount();
      cur = o;
      var title = $('over-title');
      title.textContent = o.title;
      title.style.color = o.color || '#7dff6b';
      title.style.textShadow = '0 0 14px ' + (o.color || '#7dff6b');
      $('over-line').textContent = o.line || '';
      $('over-score').textContent = (Scores.lower(o.key) ? 'TIME ' : 'SCORE ') + Scores.fmt(o.key, o.score);
      $('lbLink').href = '/leaderboard.html?game=' + encodeURIComponent(o.key);
      o.saved = false;
      var q = o.score > 0 && Scores.qualifies(o.key, o.score);
      $('ini').value = '';
      $('initials').hidden = !q;
      $('again').hidden = q;
      $('table').hidden = true;
      if (!q) renderTable();
      setTimeout(function () {
        if (cur !== o) return;
        $('over').hidden = false;
        (q ? $('ini') : $('again')).focus();
      }, o.delay || 0);
    }
  };
})();
