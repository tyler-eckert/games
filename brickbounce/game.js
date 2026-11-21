(function () {
  var GAME = 'brickbounce';
  var W = 320, H = 440;
  var COLS = 8, ROWS = 6, BW = 34, BH = 14, BGAP = 4, BTOP = 36;
  var BLEFT = Math.round((W - (COLS * BW + (COLS - 1) * BGAP)) / 2);
  var PH = 10, PY = H - 34, PW0 = 90, PMIN = 20, SHRINK = 1.5;
  var R = 5, BASE_SPEED = 240, MAX_MULT = 1.8, SPEEDUP = 1.012;
  var ROW_COLORS = ['#e86bff', '#4d6bff', '#3ef0ff', '#7dff6b', '#ffc83d', '#ff4d5e'];
  var ROW_PTS = [60, 50, 40, 30, 20, 10];

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('c'), cx = cv.getContext('2d');
  var dpr = window.devicePixelRatio || 1, scale = 1;

  var bricks, px, pw, bx, by, vx, vy, speed, base, lives, score, level, state, last = 0;
  var keyL = false, keyR = false;

  function buildBricks() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      bricks.push({ x: BLEFT + c * (BW + BGAP), y: BTOP + r * (BH + BGAP), r: r, alive: true });
    }
  }
  function attach() {
    state = 'ready';
    bx = px + pw / 2; by = PY - R - 1; vx = 0; vy = 0;
    $('hint').textContent = 'TAP OR PRESS SPACE TO LAUNCH';
  }
  function newGame() {
    score = 0; lives = 3; level = 1; base = BASE_SPEED;
    pw = PW0; px = (W - pw) / 2;
    buildBricks(); attach();
    Endgame.hide();
    hud();
  }
  function nextLevel() {
    level++; base *= 1.08;
    pw = PW0; px = Math.min(px, W - pw);
    buildBricks(); attach();
    hud();
  }
  function launch() {
    if (state !== 'ready' || HowTo.isOpen() || Endgame.isOpen()) return;
    var a = (Math.random() - 0.5) * (Math.PI / 4.5);
    speed = base;
    vx = speed * Math.sin(a); vy = -speed * Math.cos(a);
    state = 'play';
    $('hint').textContent = 'THE PADDLE SHRINKS WITH EVERY HIT';
  }
  function hud() {
    $('score').textContent = 'SCORE ' + score.toLocaleString();
    $('lives').textContent = 'LIVES ' + lives;
    $('level').textContent = 'LEVEL ' + level;
  }
  function loseLife() {
    lives--;
    hud();
    if (lives <= 0) {
      state = 'over';
      Endgame.show({
        key: GAME, title: 'GAME OVER', color: '#ff7b8a',
        line: 'REACHED LEVEL ' + level, score: score, delay: 400, onAgain: newGame
      });
    } else attach();
  }

  /* ---------- physics ---------- */
  function stepBall(dx, dy) {
    bx += dx; by += dy;
    if (bx < R) { bx = R; vx = Math.abs(vx); }
    else if (bx > W - R) { bx = W - R; vx = -Math.abs(vx); }
    if (by < R) { by = R; vy = Math.abs(vy); }
    // paddle
    if (vy > 0 && by + R >= PY && by + R <= PY + PH + 6 && bx >= px - R && bx <= px + pw + R) {
      var hit = Math.max(-1, Math.min(1, (bx - (px + pw / 2)) / (pw / 2)));
      var ang = hit * (Math.PI / 3);
      speed = Math.min(base * MAX_MULT, speed * SPEEDUP);
      vx = speed * Math.sin(ang); vy = -speed * Math.cos(ang);
      by = PY - R;
      var nw = Math.max(PMIN, pw - SHRINK);
      px += (pw - nw) / 2; pw = nw;
    }
    // bricks
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (bx + R > b.x && bx - R < b.x + BW && by + R > b.y && by - R < b.y + BH) {
        b.alive = false;
        score += ROW_PTS[b.r] * level;
        var ox = Math.min(bx + R - b.x, b.x + BW - (bx - R));
        var oy = Math.min(by + R - b.y, b.y + BH - (by - R));
        if (ox < oy) vx = (bx < b.x + BW / 2 ? -1 : 1) * Math.abs(vx);
        else vy = (by < b.y + BH / 2 ? -1 : 1) * Math.abs(vy);
        hud();
        if (bricks.every(function (k) { return !k.alive; })) { nextLevel(); return true; }
        break;
      }
    }
    if (by - R > H) { loseLife(); return true; }
    return false;
  }

  function frame(t) {
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (!HowTo.isOpen() && !Endgame.isOpen()) {
      var kv = (keyR ? 1 : 0) - (keyL ? 1 : 0);
      if (kv) {
        px = Math.max(0, Math.min(W - pw, px + kv * 340 * dt));
        if (state === 'ready') bx = px + pw / 2;
      }
      if (state === 'play') {
        var dist = Math.sqrt(vx * vx + vy * vy) * dt, steps = Math.max(1, Math.ceil(dist / 3));
        for (var i = 0; i < steps; i++) {
          if (stepBall(vx * dt / steps, vy * dt / steps)) break;
        }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- drawing ---------- */
  function rrect(x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
  }
  function draw() {
    cx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    cx.clearRect(0, 0, W, H);
    // faint grid
    cx.strokeStyle = 'rgba(122,121,187,.08)'; cx.lineWidth = 1;
    cx.beginPath();
    for (var gx = 40; gx < W; gx += 40) { cx.moveTo(gx + .5, 0); cx.lineTo(gx + .5, H); }
    for (var gy = 40; gy < H; gy += 40) { cx.moveTo(0, gy + .5); cx.lineTo(W, gy + .5); }
    cx.stroke();
    bricks.forEach(function (b) {
      if (!b.alive) return;
      cx.fillStyle = ROW_COLORS[b.r]; cx.fillRect(b.x, b.y, BW, BH);
      cx.fillStyle = 'rgba(255,255,255,.4)'; cx.fillRect(b.x, b.y, BW, 2); cx.fillRect(b.x, b.y, 2, BH);
      cx.fillStyle = 'rgba(0,0,0,.3)'; cx.fillRect(b.x, b.y + BH - 2, BW, 2); cx.fillRect(b.x + BW - 2, b.y, 2, BH);
    });
    // paddle
    cx.shadowColor = '#3ef0ff'; cx.shadowBlur = 10;
    cx.fillStyle = '#3ef0ff'; rrect(px, PY, pw, PH, 4); cx.fill();
    cx.shadowBlur = 0;
    cx.fillStyle = 'rgba(255,255,255,.5)'; cx.fillRect(px + 3, PY + 1, pw - 6, 2);
    // ball
    cx.shadowColor = '#ffc83d'; cx.shadowBlur = 12;
    cx.fillStyle = '#ffffff'; cx.beginPath(); cx.arc(bx, by, R, 0, Math.PI * 2); cx.fill();
    cx.shadowBlur = 0;
  }
  function size() {
    var s = $('screen');
    var aw = s.clientWidth - 16, ah = s.clientHeight - 16;
    scale = Math.max(0.5, Math.min(aw / W, ah / H));
    var w = Math.floor(W * scale), h = Math.floor(H * scale);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = w / W;
  }

  /* ---------- input ---------- */
  function moveTo(clientX) {
    var rect = cv.getBoundingClientRect();
    var x = (clientX - rect.left) / scale;
    px = Math.max(0, Math.min(W - pw, x - pw / 2));
    if (state === 'ready') bx = px + pw / 2;
  }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (HowTo.isOpen() || Endgame.isOpen()) return;
    moveTo(e.clientX);
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    launch();
  });
  cv.addEventListener('pointermove', function (e) {
    if (HowTo.isOpen() || Endgame.isOpen()) return;
    if (e.pointerType === 'mouse' || e.buttons) moveTo(e.clientX);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); keyL = true; }
    else if (e.key === 'ArrowRight') { e.preventDefault(); keyR = true; }
    else if (e.key === ' ') { e.preventDefault(); launch(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') keyL = false;
    else if (e.key === 'ArrowRight') keyR = false;
  });
  function togglePause() {
    if (state === 'over' || Endgame.isOpen()) return;
    if (HowTo.isOpen()) HowTo.close();
    else HowTo.show({ title: 'PAUSED', steps: ['Your game is on hold. Press RESUME to keep playing.'], button: 'RESUME' });
  }
  $('pause').addEventListener('click', togglePause);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'play' && !HowTo.isOpen()) togglePause();
  });
  window.addEventListener('resize', size);

  var HELP = [
    'Bounce the ball off your paddle to smash the blocks at the top. Clear them all to advance to the next level.',
    'Drag your finger (or move the mouse, or use the arrow keys) to slide the paddle. Tap or press Space to launch the ball.',
    'Careful: your paddle gets a little smaller every time it hits the ball, and the ball speeds up. A fresh level gives you a full-size paddle again.',
    'Top rows are worth more points. You have 3 lives. Miss the ball and you lose one.'
  ];
  $('help').addEventListener('click', function () {
    if (!HowTo.isOpen()) HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'GOT IT' });
  });

  Auth.require().then(function (s) {
    if (!s) return;
    size();
    newGame();
    requestAnimationFrame(function (t) { last = t; frame(t); });
    HowTo.show({ title: 'HOW TO PLAY', steps: HELP, button: 'START' });
  });
})();
