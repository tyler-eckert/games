/* Email + password sign-in only. No magic links, no password reset, no sign-up UI. */
(function () {
  /* Build stamp shown at the bottom of every page. Bump `n` (and the date) with each push so a new build is easy to spot. */
  var BUILD = { n: 13, date: 'Nov 26' };
  function stamp() {
    if (document.getElementById('build-stamp') || !document.body) return;
    var s = document.createElement('div'); s.id = 'build-stamp'; s.textContent = 'BUILD ' + BUILD.n + ' \u00b7 ' + BUILD.date.toUpperCase();
    s.style.cssText = 'position:fixed;left:0;right:0;bottom:calc(6px + env(safe-area-inset-bottom));text-align:center;font:7px "Press Start 2P",monospace;color:#9c9bd6;opacity:.7;pointer-events:none;z-index:1;letter-spacing:1px';
    document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stamp); else stamp();
  var cfg = window.ARCADE_CONFIG;
  var client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  function stored() {
    try {
      var o = JSON.parse(localStorage.getItem('sb-' + cfg.url.split('//')[1].split('.')[0] + '-auth-token'));
      return o && o.access_token && o.user ? o : null;
    } catch (e) { return null; }
  }
  function reveal() { document.documentElement.classList.remove('auth-pending'); }
  function onLogin() { return /\/login\.html$/.test(location.pathname); }

  /* Play log (table public.arcade_plays): one row each time a game is started.
     Games that open ready to play call Auth.play(game), which waits for the first tap or key press so just opening a game does not count.
     Games that start from a button call Auth.play(game, { now: true }). Never blocks play; offline plays are sent later. */
  var PQ = 'arcade.plays.queue', lastPlay = {}, pendingGame = null, armed = false;
  function pq() { try { return JSON.parse(localStorage.getItem(PQ)) || []; } catch (e) { return []; } }
  function savePq(q) { try { localStorage.setItem(PQ, JSON.stringify(q.slice(-200))); } catch (e) {} }
  var sending = false;
  function sendPlays() {
    if (!navigator.onLine || sending) return;
    var q = pq(); if (!q.length) return;
    sending = true;
    getSessionQuiet().then(function (s) {
      if (!s) { sending = false; return; }
      var mine = q.filter(function (r) { return r.uid === s.user.id; }), rest = q.filter(function (r) { return r.uid !== s.user.id; });
      if (!mine.length) { sending = false; return; }
      client.from('arcade_plays').insert(mine.map(function (r) { return { game: r.game, created_at: r.at }; })).then(function (r) {
        sending = false; var cur = pq().filter(function (x) { return !mine.some(function (m) { return m.at === x.at && m.game === x.game && m.uid === x.uid; }); });
        if (!(r && r.error)) savePq(cur);
      }, function () { sending = false; });
    });
  }
  function getSessionQuiet() { return client.auth.getSession().then(function (r) { return r.data && r.data.session; }).catch(function () { return null; }); }
  function logPlay(game) {
    var now = Date.now();
    if (lastPlay[game] && now - lastPlay[game] < 2000) return;   // a double start is one play
    lastPlay[game] = now;
    getSessionQuiet().then(function (s) {
      if (!s) return;
      var q = pq(); q.push({ game: game, at: new Date(now).toISOString(), uid: s.user.id }); savePq(q);
      sendPlays();
    });
  }
  function onFirstInput(e) {
    var t = e.target;
    if (t && t.closest && t.closest('a, .bar, .iconbtn, .overlay')) return;
    document.removeEventListener('pointerdown', onFirstInput, true); document.removeEventListener('keydown', onFirstInput, true);
    armed = false;
    if (pendingGame) { var g = pendingGame; pendingGame = null; logPlay(g); }
  }
  window.addEventListener('online', sendPlays);
  setTimeout(sendPlays, 4000);

  window.Auth = {
    client: client,
    play: function (game, opt) {
      try {
        if (opt && opt.now) { pendingGame = null; logPlay(game); return; }
        pendingGame = game;
        if (!armed) { armed = true; document.addEventListener('pointerdown', onFirstInput, true); document.addEventListener('keydown', onFirstInput, true); }
      } catch (e) {}
    },
    reveal: reveal,
    // Offline-friendly: with no connection (or a failed token refresh), fall back to the sign-in saved on this device.
    session: function () {
      return client.auth.getSession().then(function (r) {
        if (r.data && r.data.session) return r.data.session;
        var netErr = r.error && /fetch|network|load failed/i.test(r.error.message || '');
        return (!navigator.onLine || netErr) ? stored() : null;
      }).catch(function () { return stored(); });
    },
    online: function () { return navigator.onLine !== false; },
    // Call on every protected page. Redirects to the login page when signed out.
    require: function () {
      return this.session().then(function (s) {
        if (!s) {
          location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
          return null;
        }
        reveal();
        return s;
      });
    },
    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password });
    },
    signOut: function () {
      return client.auth.signOut().then(function () { location.replace('/login.html'); });
    }
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  client.auth.onAuthStateChange(function (ev) {
    if (ev === 'SIGNED_OUT' && !onLogin()) location.replace('/login.html');
  });
})();
