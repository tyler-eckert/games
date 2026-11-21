#!/usr/bin/env python3
"""Builds _lan/: a copy of the arcade that needs no internet, to serve from a computer on your own network.
No sign-in (the devices are trusted), scores stay on each device, fonts are bundled, online races are off.
Run from the games folder:  python3 tools/build-lan.py"""
import os, re, shutil, sys
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = os.path.join(root, '_lan')
if os.path.exists(out): shutil.rmtree(out, ignore_errors=True)
SKIP = {'.git', '_lan', 'tools', 'CNAME', '.gitignore', 'sw.js', 'login.html', 'config.js'}
def keep(name): return name not in SKIP and not name.startswith('_') and name != '.DS_Store'
for d, dirs, files in os.walk(root):
    dirs[:] = [x for x in dirs if keep(x)]
    for f in files:
        if not keep(f): continue
        src = os.path.join(d, f); dst = os.path.join(out, os.path.relpath(src, root))
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst)
os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
shutil.copy(os.path.join(root, 'tools/press-start-2p.woff2'), os.path.join(out, 'fonts/press-start-2p.woff2'))
open(os.path.join(out, 'css/font.css'), 'w').write("@font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/press-start-2p.woff2') format('woff2')}\n")
STUB = """/* Local build: no server, no sign-in. This device is trusted; scores are kept on the device only. */
(function () {
  function reveal() { document.documentElement.classList.remove('auth-pending'); }
  var s = { user: { id: 'local', email: 'player@local' } };
  window.Auth = {
    client: null, reveal: reveal,
    session: function () { return Promise.resolve(s); },
    online: function () { return false },
    require: function () { reveal(); return Promise.resolve(s); },
    signIn: function () { return Promise.resolve({}); },
    signOut: function () { location.href = '/'; }
  };
})();
"""
open(os.path.join(out, 'js/auth.js'), 'w').write(STUB)
for d, _, files in os.walk(out):
    for f in files:
        if not f.endswith('.html'): continue
        p = os.path.join(d, f); t = open(p).read()
        t = re.sub(r'\s*<script src="https://cdn\.jsdelivr[^>]*></script>', '', t)
        t = re.sub(r'\s*<script src="(\.\./)?js/config\.js"></script>', '', t)
        t = re.sub(r'\s*<link rel="preconnect"[^>]*>', '', t)
        t = re.sub(r'<link href="https://fonts\.googleapis[^>]*>', '<link rel="stylesheet" href="/css/font.css">', t)
        t = re.sub(r'\s*<link rel="manifest"[^>]*>', '', t)
        t = t.replace(' <button class="linkbtn" id="out" type="button">SIGN OUT</button>', '')
        open(p, 'w').write(t)
open(os.path.join(out, 'start-arcade.command'), 'w').write("""#!/bin/bash
# Double-click on a Mac. Keep this window open while the devices play.
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo ""
echo "  ECKERTHAUS ARCADE is running."
echo "  On each device (same Wi-Fi), open:   http://$IP:8080"
echo "  Press Ctrl+C to stop."
echo ""
python3 -m http.server 8080 --bind 0.0.0.0
""")
os.chmod(os.path.join(out, 'start-arcade.command'), 0o755)
bad = []
for d, _, files in os.walk(out):
    for f in files:
        if f.endswith(('.html', '.js', '.css')):
            for m in re.findall(r'https?://[^\s"\')]+', open(os.path.join(d, f)).read()):
                if 'w3.org' not in m and 'wikipedia' not in m: bad.append((f, m))
print('external references left:', bad or 'none')
