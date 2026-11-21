/* Email + password sign-in only. No magic links, no password reset, no sign-up UI. */
(function () {
  var cfg = window.ARCADE_CONFIG;
  var client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  function reveal() { document.documentElement.classList.remove('auth-pending'); }
  function onLogin() { return /\/login\.html$/.test(location.pathname); }

  window.Auth = {
    client: client,
    reveal: reveal,
    session: function () {
      return client.auth.getSession().then(function (r) { return r.data.session; });
    },
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

  client.auth.onAuthStateChange(function (ev) {
    if (ev === 'SIGNED_OUT' && !onLogin()) location.replace('/login.html');
  });
})();
