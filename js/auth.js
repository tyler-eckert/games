/* Email + password sign-in only. No magic links, no password reset, no sign-up UI. */
(function () {
  /* Build stamp shown at the bottom of every page. Bump `n` (and the date) with each push so a new build is easy to spot. */
  var BUILD = { n: 1, date: 'Nov 22' };
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

  window.Auth = {
    client: client,
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
