/* Arcade high scores. Local-first (instant, works offline), and every saved score is also
   posted to the shared leaderboard in Supabase (table public.arcade_scores) under the signed-in login. */
(function () {
  var KEY = function (g) { return 'arcade.scores.' + g; };
  /* Sudoku scores are solve times in seconds, so lower is better; everything else is points. */
  function lower(g) { return /^sudoku-/.test(g); }
  function better(g, a, b) { return lower(g) ? a < b : a > b; }
  function fmt(g, v) {
    if (lower(g)) { var m = Math.floor(v / 60), s = v % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    return Number(v).toLocaleString();
  }
  function read(g) {
    try { return JSON.parse(localStorage.getItem(KEY(g))) || []; } catch (e) { return []; }
  }
  function playerName(session) {
    var email = session && session.user && session.user.email || '';
    var n = email.split('@')[0].replace(/[^A-Za-z0-9._-]/g, '').slice(0, 20);
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Player';
  }
  /* Scores saved while offline wait in a queue on this device and are sent to the shared leaderboard when you reconnect. */
  var QKEY = 'arcade.queue';
  function queue() { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch (e) { return []; } }
  function saveQueue(q) { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} }
  function netProblem(err) { return !navigator.onLine || (err && /fetch|network|load failed|timeout/i.test(err.message || '')); }
  function sendRow(row) {
    return Auth.client.from('arcade_scores').insert(row).then(function (r) {
      if (r.error && netProblem(r.error)) throw r.error;
    });
  }
  function flush() {
    if (!window.Auth || !Auth.client || !navigator.onLine) return Promise.resolve();
    var q = queue();
    if (!q.length) return Promise.resolve();
    return Auth.client.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) return;
      var chain = Promise.resolve(), left = q.slice();
      q.forEach(function (row) {
        chain = chain.then(function () {
          if (row.uid && row.uid !== s.user.id) return;   // belongs to another login on this device
          var body = { player: row.player, game: row.game, initials: row.initials, score: row.score };
          return sendRow(body).then(function () { left = left.filter(function (x) { return x !== row; }); });
        });
      });
      return chain.catch(function () {}).then(function () { saveQueue(q.filter(function (x) { return left.some(function (y) { return y.at === x.at && y.game === x.game; }); })); });
    }).catch(function () {});
  }
  window.addEventListener('online', flush);
  setTimeout(flush, 2500);
  function remoteSubmit(g, initials, score) {
    if (!window.Auth || !Auth.client) return Promise.resolve();
    return Auth.session().then(function (s) {
      if (!s) return;
      var row = { player: playerName(s), game: g, initials: initials, score: Math.round(score) };
      function keep() { var q = queue(); q.push({ player: row.player, game: g, initials: initials, score: row.score, uid: s.user.id, at: Date.now() }); saveQueue(q); }
      if (!navigator.onLine) { keep(); return; }
      return sendRow(row).catch(keep);
    }).catch(function () {});
  }
  window.Scores = {
    top: function (g, n) { return Promise.resolve(read(g).slice(0, n || 5)); },
    best: function (g) { var l = read(g); return l.length ? l[0].score : null; },
    lower: lower, fmt: fmt, better: better,
    qualifies: function (g, score) {
      var l = read(g);
      return score > 0 && (l.length < 10 || better(g, score, l[l.length - 1].score));
    },
    submit: function (g, initials, score) {
      var l = read(g);
      l.push({ initials: initials, score: score, at: Date.now() });
      l.sort(function (a, b) { return lower(g) ? a.score - b.score : b.score - a.score; });
      try { localStorage.setItem(KEY(g), JSON.stringify(l.slice(0, 10))); } catch (e) {}
      return remoteSubmit(g, initials, score);
    },
    playerName: playerName,
    /* Shared leaderboard: best score per login for one game key. Resolves to [{player, initials, score, mine}]. */
    board: function (g, n) {
      if (!window.Auth || !Auth.client) {   // local build with no server: show this device's own scores
        return Promise.resolve(read(g).slice(0, n || 10).map(function (r) { return { player: 'THIS DEVICE', initials: r.initials, score: r.score, mine: true }; }));
      }
      var CK = 'arcade.board.' + g;
      function cached() { try { return JSON.parse(localStorage.getItem(CK)) || []; } catch (e) { return []; } }
      if (!navigator.onLine) return Promise.resolve(cached().slice(0, n || 10));
      return Auth.session().then(function (s) {
        var me = s && s.user && s.user.id;
        return Auth.client.from('arcade_scores')
          .select('user_id,player,initials,score,created_at')
          .eq('game', g).order('score', { ascending: lower(g) }).limit(300)
          .then(function (r) {
            if (r.error) throw r.error;
            var seen = {}, out = [];
            (r.data || []).forEach(function (row) {
              if (seen[row.user_id]) return;
              seen[row.user_id] = 1;
              out.push({ player: row.player, initials: row.initials, score: row.score, mine: row.user_id === me });
            });
            try { localStorage.setItem(CK, JSON.stringify(out.slice(0, 50))); } catch (e) {}
            return out.slice(0, n || 10);
          });
      }).catch(function () { return cached().slice(0, n || 10); });
    }
  };
})();
