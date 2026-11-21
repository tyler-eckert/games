/* Arcade high scores. Local-first (instant, works offline), and every saved score is also
   posted to the shared leaderboard in Supabase (table public.arcade_scores) under the signed-in login. */
(function () {
  var KEY = function (g) { return 'arcade.scores.' + g; };
  function read(g) {
    try { return JSON.parse(localStorage.getItem(KEY(g))) || []; } catch (e) { return []; }
  }
  function playerName(session) {
    var email = session && session.user && session.user.email || '';
    var n = email.split('@')[0].replace(/[^A-Za-z0-9._-]/g, '').slice(0, 20);
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Player';
  }
  function remoteSubmit(g, initials, score) {
    if (!window.Auth || !Auth.client) return Promise.resolve();
    return Auth.session().then(function (s) {
      if (!s) return;
      return Auth.client.from('arcade_scores').insert({
        player: playerName(s), game: g, initials: initials, score: Math.round(score)
      });
    }).catch(function () {});
  }
  window.Scores = {
    top: function (g, n) { return Promise.resolve(read(g).slice(0, n || 5)); },
    best: function (g) { var l = read(g); return l.length ? l[0].score : null; },
    qualifies: function (g, score) {
      var l = read(g);
      return score > 0 && (l.length < 10 || score > l[l.length - 1].score);
    },
    submit: function (g, initials, score) {
      var l = read(g);
      l.push({ initials: initials, score: score, at: Date.now() });
      l.sort(function (a, b) { return b.score - a.score; });
      try { localStorage.setItem(KEY(g), JSON.stringify(l.slice(0, 10))); } catch (e) {}
      return remoteSubmit(g, initials, score);
    },
    playerName: playerName,
    /* Shared leaderboard: best score per login for one game key. Resolves to [{player, initials, score, mine}]. */
    board: function (g, n) {
      return Auth.session().then(function (s) {
        var me = s && s.user && s.user.id;
        return Auth.client.from('arcade_scores')
          .select('user_id,player,initials,score,created_at')
          .eq('game', g).order('score', { ascending: false }).limit(300)
          .then(function (r) {
            if (r.error) throw r.error;
            var seen = {}, out = [];
            (r.data || []).forEach(function (row) {
              if (seen[row.user_id]) return;
              seen[row.user_id] = 1;
              out.push({ player: row.player, initials: row.initials, score: row.score, mine: row.user_id === me });
            });
            return out.slice(0, n || 10);
          });
      });
    }
  };
})();
