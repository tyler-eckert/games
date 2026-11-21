/* Arcade high scores. Local-first; a remote backend can be layered on later. */
(function () {
  var KEY = function (g) { return 'arcade.scores.' + g; };
  function read(g) {
    try { return JSON.parse(localStorage.getItem(KEY(g))) || []; } catch (e) { return []; }
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
      return Promise.resolve();
    }
  };
})();
