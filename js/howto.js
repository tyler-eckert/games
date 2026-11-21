/* Shared "how to play" dialog. HowTo.show({title, steps:[...], button}) */
(function () {
  var openEl = null, returnFocus = null;

  function close() {
    if (!openEl) return;
    openEl.remove();
    openEl = null;
    document.removeEventListener('keydown', onKey, true);
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab' && openEl) { // keep focus on the single button
      e.preventDefault();
      openEl.querySelector('button').focus();
    }
  }

  window.HowTo = {
    isOpen: function () { return !!openEl; },
    close: close,
    show: function (cfg) {
      close();
      returnFocus = document.activeElement;
      var o = document.createElement('div');
      o.className = 'overlay howto';
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-modal', 'true');
      o.setAttribute('aria-labelledby', 'howto-title');
      var p = document.createElement('div');
      p.className = 'panel';
      var h = document.createElement('h2');
      h.id = 'howto-title';
      h.textContent = cfg.title;
      h.style.color = 'var(--cyan)';
      h.style.fontSize = '16px';
      var ol = document.createElement('ol');
      cfg.steps.forEach(function (s) {
        var li = document.createElement('li');
        li.textContent = s;
        ol.appendChild(li);
      });
      var b = document.createElement('button');
      b.className = 'big-btn';
      b.type = 'button';
      b.textContent = cfg.button || 'GOT IT';
      b.addEventListener('click', close);
      p.appendChild(h); p.appendChild(ol); p.appendChild(b);
      o.appendChild(p);
      document.body.appendChild(o);
      openEl = o;
      document.addEventListener('keydown', onKey, true);
      b.focus();
    }
  };
})();
