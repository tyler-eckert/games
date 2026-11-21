/* Email + password sign-in only. No magic links, no password reset, no sign-up UI. */
(function () {
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
