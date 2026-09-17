/**
 * TRAP RUN — Cinematic Death Chamber Menu Scene
 * High-performance canvas renderer. All heavy gradients are pre-cached.
 * Adapts particle count to device performance automatically.
 */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let canvas, ctx, W, H, raf;
  let running  = false;
  let t        = 0;
  let lastTS   = 0;

  // Performance budget: reduces effects on weak devices
  let fps60frames = 0, fpsSamples = 0, fpsAvg = 60;
  let qualityTier = 2; // 2=high, 1=mid, 0=low

  // Camera
  const CAM = { x: 0, y: 0 };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const rng   = (a, b) => a + Math.random() * (b - a);
  const lerp  = (a, b, f) => a + (b - a) * f;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ─── Scene objects (rebuilt on resize) ───────────────────────────────────
  let scene = null;

  function buildScene() {
    if (!W || !H) return;
    const q = qualityTier;

    // Fog layers
    const fogLayers = [];
    const fogCount  = q >= 2 ? 4 : 2;
    for (let i = 0; i < fogCount; i++) {
      fogLayers.push({
        x: rng(-0.3, 0.1) * W, y: rng(0.45, 0.88) * H,
        w: rng(0.7, 1.6) * W,  h: rng(0.12, 0.28) * H,
        speed: rng(0.006, 0.018) * W,
        alpha: rng(0.04, 0.10),
        hue: rng(260, 295),
        phase: rng(0, Math.PI * 2)
      });
    }

    // Cracks
    const cracks = [];
    const crackCount = q >= 1 ? 10 : 5;
    for (let i = 0; i < crackCount; i++) {
      const branches = [];
      buildCrack(rng(0.05, 0.95) * W, rng(0.74, 0.98) * H,
                 rng(-80, -40), rng(50, 120), q >= 2 ? 4 : 3, branches);
      cracks.push({ branches, phase: rng(0, Math.PI * 2) });
    }

    // Spikes
    const spikes = [];
    const spikeStep = q >= 2 ? 55 : 90;
    for (let x = rng(0, spikeStep); x < W; x += spikeStep + rng(-10, 10)) {
      spikes.push({
        x, baseY: H,
        height: rng(30, 72), width: rng(10, 20),
        phase: rng(0, Math.PI * 2), speed: rng(0.4, 1.1)
      });
    }

    // Chains
    const chains = [];
    const chainStep = q >= 2 ? 110 : 180;
    for (let x = rng(40, chainStep); x < W; x += chainStep + rng(-20, 20)) {
      chains.push({
        x, segLen: rng(18, 26),
        segCount: Math.floor(rng(5, q >= 2 ? 13 : 8)),
        phase: rng(0, Math.PI * 2),
        speed: rng(0.12, 0.35),
        swayAmt: rng(5, 15)
      });
    }

    // Platforms
    const platforms = [];
    const platCount = q >= 2 ? 7 : 4;
    for (let i = 0; i < platCount; i++) {
      platforms.push({
        x: rng(0.05, 0.9)  * W,
        y: rng(0.35, 0.75) * H,
        w: rng(60, 150), h: rng(14, 22),
        phase: rng(0, Math.PI * 2),
        speed: rng(0.2, 0.4),
        tilt: rng(-0.1, 0.1),
        depth: rng(0.3, 1.0),
      });
    }
    platforms.sort((a, b) => a.depth - b.depth);

    // Mini skulls
    const miniSkulls = [];
    const skullCount = q >= 2 ? 10 : 5;
    for (let i = 0; i < skullCount; i++) spawnMiniSkull(miniSkulls, true);

    // Embers — count based on quality
    const embers = [];
    const emberCount = q >= 2 ? 60 : (q === 1 ? 30 : 15);
    for (let i = 0; i < emberCount; i++) spawnEmber(embers, true);

    // Lightning state
    const lightning = {
      active: false, timer: 0, nextFlash: rng(5, 12),
      bolts: [], intensity: 0
    };

    scene = { fogLayers, cracks, spikes, chains, platforms, miniSkulls, embers, lightning };
  }

  function buildCrack(x, y, angle, length, depth, out) {
    if (depth <= 0 || length < 6) return;
    const r  = angle * Math.PI / 180;
    const ex = x + Math.cos(r) * length;
    const ey = y + Math.sin(r) * length;
    out.push([x, y, ex, ey]);
    if (depth > 1) {
      buildCrack(ex, ey, angle + rng(-35, -5),  length * rng(0.5, 0.75), depth - 1, out);
      buildCrack(ex, ey, angle + rng(5,  45),   length * rng(0.4, 0.65), depth - 1, out);
    }
  }

  function spawnMiniSkull(arr, initial) {
    arr.push({
      x:        rng(0.05, 0.95) * W,
      y:        initial ? rng(0.05, 0.9) * H : H + 10,
      size:     rng(10, 28),
      vy:       rng(0.15, 0.6),
      vx:       rng(-0.25, 0.25),
      alpha:    rng(0.05, 0.16),
      rot:      rng(0, Math.PI * 2),
      rotSpeed: rng(-0.004, 0.004),
      depth:    rng(0.2, 0.7),
    });
  }

  function spawnEmber(arr, initial) {
    arr.push({
      x:     rng(0.05, 0.95) * W,
      y:     initial ? rng(0, H) : rng(H * 0.65, H),
      vx:    rng(-0.6, 0.6),
      vy:    rng(-2.2, -0.5),
      life:  1,
      decay: rng(0.004, 0.012),
      size:  rng(1.5, 3.5),
      hue:   rng(12, 42),
    });
  }

  // ─── Resize / init ───────────────────────────────────────────────────────
  function sizeCanvas() {
    if (!canvas) return;
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    canvas = document.getElementById('menu-bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    requestAnimationFrame(() => {
      sizeCanvas();
      buildScene();
      running = true;
      lastTS = performance.now();
      raf = requestAnimationFrame(loop);
    });
    if (window.ResizeObserver) {
      new ResizeObserver(() => { sizeCanvas(); buildScene(); }).observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener('resize', () => { sizeCanvas(); buildScene(); });
    }
  }

  // ─── Main loop ───────────────────────────────────────────────────────────
  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);

    const raw = (ts - lastTS) / 1000;
    lastTS = ts;
    const dt = Math.min(raw, 0.05); // clamp to avoid spiral-of-death
    t += dt;

    // Adaptive quality: measure FPS every 90 frames
    fpsSamples++;
    if (raw > 0) fps60frames += (1 / raw) > 55 ? 1 : 0;
    if (fpsSamples === 90) {
      fpsAvg = fps60frames / 90 * 60;
      if (fpsAvg < 30 && qualityTier > 0) { qualityTier--; buildScene(); }
      else if (fpsAvg > 55 && qualityTier < 2) { qualityTier++; buildScene(); }
      fpsSamples = 0; fps60frames = 0;
    }

    updateScene(dt);
    drawFrame();
  }

  // ─── Update ──────────────────────────────────────────────────────────────
  function updateScene(dt) {
    if (!scene) return;
    const { fogLayers, embers, miniSkulls, lightning } = scene;

    // Camera drift
    const camTx = Math.sin(t * 0.12) * 5 + Math.sin(t * 0.07) * 2.5;
    const camTy = Math.cos(t * 0.09) * 3.5 + Math.cos(t * 0.16) * 1.5;
    CAM.x = lerp(CAM.x, camTx, 0.035);
    CAM.y = lerp(CAM.y, camTy, 0.035);

    // Fog scroll
    fogLayers.forEach(f => {
      f.x += f.speed * dt;
      if (f.x > W * 0.35) f.x = -f.w * 0.8;
    });

    // Embers
    const maxEmbers = qualityTier >= 2 ? 60 : (qualityTier === 1 ? 30 : 15);
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x    += e.vx;
      e.y    += e.vy;
      // Tiny drift without Math.random every frame
      e.vx   += (((e.x * 13.7 + t * 37) % 0.16) - 0.08) * 0.5;
      e.life -= e.decay;
      if (e.life <= 0 || e.y < -20) {
        embers.splice(i, 1);
        if (embers.length < maxEmbers) spawnEmber(embers, false);
      }
    }
    while (embers.length < maxEmbers) spawnEmber(embers, false);

    // Mini skulls
    const maxSkulls = qualityTier >= 2 ? 10 : 5;
    for (let i = miniSkulls.length - 1; i >= 0; i--) {
      const s = miniSkulls[i];
      s.y   -= s.vy;
      s.x   += s.vx;
      s.rot += s.rotSpeed;
      if (s.y < -60) {
        miniSkulls.splice(i, 1);
        if (miniSkulls.length < maxSkulls) spawnMiniSkull(miniSkulls, false);
      }
    }
    while (miniSkulls.length < maxSkulls) spawnMiniSkull(miniSkulls, false);

    // Lightning
    lightning.timer += dt;
    if (!lightning.active && lightning.timer >= lightning.nextFlash) {
      lightning.active    = true;
      lightning.timer     = 0;
      lightning.nextFlash = rng(6, 15);
      lightning.intensity = 1;
      lightning.bolts     = qualityTier >= 1 ? buildBolts() : [];
    }
    if (lightning.active) {
      lightning.intensity -= dt * 4;
      if (lightning.intensity <= 0) { lightning.active = false; lightning.intensity = 0; }
    }
  }

  function buildBolts() {
    const bolts = [];
    const count = Math.floor(rng(1, 3));
    for (let b = 0; b < count; b++) {
      const pts = [[rng(0.15, 0.85) * W, 0]];
      let [cx, cy] = pts[0];
      while (cy < H * 0.6) {
        cx += rng(-38, 38); cy += rng(28, 65);
        pts.push([clamp(cx, 0, W), cy]);
        if (Math.random() < 0.3) {
          const bpts = [[cx, cy]];
          let bx = cx, by = cy;
          for (let j = 0; j < 3; j++) { bx += rng(-25, 25); by += rng(18, 45); bpts.push([bx, by]); }
          bolts.push({ pts: bpts, branch: true });
        }
      }
      bolts.push({ pts, branch: false });
    }
    return bolts;
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────
  function drawFrame() {
    if (!scene) return;
    ctx.save();
    ctx.translate(CAM.x, CAM.y);

    drawBg();
    if (qualityTier >= 1) drawFog();
    drawCracks();
    drawSpikes();
    if (qualityTier >= 1) drawPlatforms();
    drawChains();
    drawSkull();
    drawSkullFire();
    if (qualityTier >= 2) drawMiniSkulls();
    drawEmbers();
    if (qualityTier >= 1) drawLightning();
    drawVignette();

    ctx.restore();
  }

  // ── Background ────────────────────────────────────────────────────────────
  function drawBg() {
    // Simple solid fill + two radial accents — no per-frame gradient recreation
    ctx.fillStyle = '#07000f';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Top purple haze
    const tp = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.65);
    tp.addColorStop(0,   'rgba(70, 0, 110, 0.20)');
    tp.addColorStop(0.5, 'rgba(35, 0, 70, 0.08)');
    tp.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = tp;
    ctx.fillRect(0, 0, W, H * 0.5);

    // Floor red glow
    const fl = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, W * 0.85);
    fl.addColorStop(0,   'rgba(190, 0, 25, 0.24)');
    fl.addColorStop(0.4, 'rgba(100, 0, 18, 0.10)');
    fl.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = fl;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Skull zone glow
    const pulse = 0.10 + 0.04 * Math.sin(t * 1.1);
    const sg = ctx.createRadialGradient(W / 2, H * 0.23, 0, W / 2, H * 0.23, W * 0.38);
    sg.addColorStop(0,   `rgba(170, 0, 55, ${pulse})`);
    sg.addColorStop(0.5, 'rgba(70, 0, 28, 0.05)');
    sg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H * 0.65);
  }

  // ── Fog ───────────────────────────────────────────────────────────────────
  function drawFog() {
    scene.fogLayers.forEach((f, i) => {
      const pulse = 0.65 + 0.35 * Math.sin(t * 0.28 + i * 1.3 + f.phase);
      const g = ctx.createRadialGradient(
        f.x + f.w / 2, f.y + f.h / 2, 0,
        f.x + f.w / 2, f.y + f.h / 2, Math.max(f.w, f.h) * 0.55
      );
      g.addColorStop(0,   `hsla(${f.hue},75%,18%,${f.alpha * pulse})`);
      g.addColorStop(0.55,`hsla(${f.hue},55%,10%,${f.alpha * pulse * 0.45})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x, f.y, f.w, f.h);
    });
  }

  // ── Cracks ────────────────────────────────────────────────────────────────
  function drawCracks() {
    scene.cracks.forEach((crack, ci) => {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.1 + crack.phase);
      crack.branches.forEach(([x1, y1, x2, y2]) => {
        ctx.lineCap = 'round';
        // Glow
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255,18,28,${0.07 * pulse})`; ctx.lineWidth = 7; ctx.stroke();
        // Mid
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255,75,35,${0.16 * pulse})`; ctx.lineWidth = 2.5; ctx.stroke();
        // Core
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255,175,55,${0.5 * pulse})`; ctx.lineWidth = 0.9; ctx.stroke();
      });
    });
  }

  // ── Spikes ────────────────────────────────────────────────────────────────
  function drawSpikes() {
    scene.spikes.forEach(s => {
      const emerge = 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
      const sh = s.height * emerge;
      const by = s.baseY + 2;
      const ty = by - sh;
      const hw = s.width / 2;

      ctx.beginPath();
      ctx.moveTo(s.x, ty);
      ctx.lineTo(s.x - hw, by);
      ctx.lineTo(s.x + hw, by);
      ctx.closePath();
      const g = ctx.createLinearGradient(s.x - hw, by, s.x, ty);
      g.addColorStop(0,   '#1a0008');
      g.addColorStop(0.5, '#4a0018');
      g.addColorStop(1,   '#1f0008');
      ctx.fillStyle = g;
      ctx.fill();

      // Tip glint
      ctx.beginPath();
      ctx.moveTo(s.x, ty);
      ctx.lineTo(s.x - 1.5, ty + sh * 0.18);
      ctx.lineTo(s.x + 1.5, ty + sh * 0.18);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,50,70,${0.45 * emerge})`;
      ctx.fill();
    });
  }

  // ── Platforms ─────────────────────────────────────────────────────────────
  function drawPlatforms() {
    scene.platforms.forEach(p => {
      const fy = p.y + Math.sin(t * p.speed + p.phase) * 7;
      const tilt = p.tilt + Math.sin(t * p.speed * 0.65 + p.phase) * 0.035;
      const alpha = 0.28 + p.depth * 0.5;

      ctx.save();
      ctx.translate(p.x, fy);
      ctx.rotate(tilt);
      // No CSS filter — use alpha for DoF instead
      ctx.globalAlpha = alpha;

      const g = ctx.createLinearGradient(0, 0, 0, p.h);
      g.addColorStop(0,   'rgba(48,18,58,1)');
      g.addColorStop(1,   'rgba(14, 4,24,1)');
      ctx.fillStyle = g;
      rrect(ctx, -p.w / 2, 0, p.w, p.h, 3); ctx.fill();

      // Top edge highlight
      ctx.fillStyle = 'rgba(110,50,150,0.3)';
      rrect(ctx, -p.w / 2, 0, p.w, 3, 2); ctx.fill();

      // Border glow
      ctx.strokeStyle = 'rgba(120,25,185,0.4)';
      ctx.lineWidth = 1;
      rrect(ctx, -p.w / 2, 0, p.w, p.h, 3); ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }

  // ── Chains ────────────────────────────────────────────────────────────────
  function drawChains() {
    scene.chains.forEach(chain => {
      const sway = Math.sin(t * chain.speed + chain.phase) * chain.swayAmt * (Math.PI / 180);
      ctx.save();
      ctx.translate(chain.x, -6);
      let cx = 0, cy = 0, angle = sway;
      for (let s = 0; s < chain.segCount; s++) {
        const nx = cx + Math.sin(angle) * chain.segLen;
        const ny = cy + Math.cos(angle) * chain.segLen;
        drawLink(cx, cy, nx, ny);
        angle += Math.sin(t * 0.28 + s * 0.55) * 0.035;
        cx = nx; cy = ny;
      }
      ctx.restore();
    });
  }

  function drawLink(x1, y1, x2, y2) {
    const mcx = (x1 + x2) / 2, mcy = (y1 + y2) / 2;
    const len  = Math.hypot(x2 - x1, y2 - y1);
    const ang  = Math.atan2(y2 - y1, x2 - x1);
    const lw   = len * 0.42, lh = lw * 0.48;

    ctx.save();
    ctx.translate(mcx, mcy);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#2a2a42';
    ctx.lineWidth   = lh;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-lw * 0.38, 0);
    ctx.lineTo( lw * 0.38, 0);
    ctx.stroke();
    // Highlight
    ctx.strokeStyle = 'rgba(100,85,160,0.3)';
    ctx.lineWidth   = lh * 0.28;
    ctx.beginPath();
    ctx.moveTo(-lw * 0.28, -lh * 0.14);
    ctx.lineTo( lw * 0.28, -lh * 0.14);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Main skull ────────────────────────────────────────────────────────────
  function drawSkull() {
    const cx  = W / 2;
    const r   = clamp(W * 0.135, 55, 152);
    const bobY = H * 0.22 + Math.sin(t * 0.52) * 7;
    const tiltX = Math.sin(t * 0.30) * 0.055;

    // Background ambient
    const pulse = 0.16 + 0.05 * Math.sin(t * 0.88);
    const bg = ctx.createRadialGradient(cx, bobY, r * 0.1, cx, bobY, r * 3.2);
    bg.addColorStop(0,   `rgba(210,0,55,${pulse})`);
    bg.addColorStop(0.35,'rgba(110,0,38,0.09)');
    bg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, bobY, r * 3.2, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(cx, bobY);
    ctx.rotate(tiltX);

    // ── Cranium ──
    const cg = ctx.createRadialGradient(-r * 0.22, -r * 0.28, r * 0.04, 0, 0, r);
    cg.addColorStop(0,    '#fffdee');
    cg.addColorStop(0.28, '#f0dcc8');
    cg.addColorStop(0.62, '#b08888');
    cg.addColorStop(1,    '#5a3040');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.04, r, r * 1.04, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shading
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(r * 0.18, r * 0.14, r * 0.62, r * 0.52, 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.19, -r * 0.52, r * 0.42, r * 0.26, -0.38, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes ──
    for (let si = 0; si < 2; si++) {
      const side = si === 0 ? -1 : 1;
      const ex = side * r * 0.31, ey = -r * 0.05;
      const ew = r * 0.24, eh = r * 0.27;

      // Socket
      ctx.fillStyle = '#0c000f';
      ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.fill();

      // Glow iris
      const ep = 0.68 + 0.32 * Math.sin(t * 1.35 + si * Math.PI);
      const ig = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 0.82);
      ig.addColorStop(0,   `rgba(255,215,55,${0.94 * ep})`);
      ig.addColorStop(0.32,`rgba(255, 75, 0,${0.78 * ep})`);
      ig.addColorStop(0.72,`rgba(195,  0, 0,${0.58 * ep})`);
      ig.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(ex, ey, ew * 0.82, eh * 0.82, 0, 0, Math.PI * 2); ctx.fill();

      // Eye outer halo
      const hg = ctx.createRadialGradient(ex, ey, ew * 0.55, ex, ey, ew * 2.1);
      hg.addColorStop(0,   `rgba(255,95,0,${0.28 * ep})`);
      hg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(ex, ey, ew * 2.1, 0, Math.PI * 2); ctx.fill();
    }

    // ── Nose ──
    const ns = r * 0.12;
    ctx.fillStyle = '#0c000f';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.19); ctx.lineTo(-ns, r * 0.36); ctx.lineTo(ns, r * 0.36);
    ctx.closePath(); ctx.fill();

    // ── Jaw ──
    const jy = r * 0.47, jw = r * 1.08, jh = r * 0.50;
    const jg = ctx.createLinearGradient(0, jy, 0, jy + jh);
    jg.addColorStop(0, '#c8a8a0'); jg.addColorStop(1, '#6a3850');
    ctx.fillStyle = jg;
    rrect(ctx, -jw / 2, jy, jw, jh, 8); ctx.fill();

    // Teeth
    const tc = 7, tw = jw * 0.88 / tc;
    for (let ti = 0; ti < tc; ti++) {
      const tx = -jw * 0.44 + ti * tw + tw * 0.08;
      const isGap = ti === 2 || ti === 5;
      const tH = isGap ? r * 0.11 : r * 0.21;
      const tg = ctx.createLinearGradient(0, jy, 0, jy + tH);
      tg.addColorStop(0, '#fff8e8'); tg.addColorStop(1, '#c9a480');
      ctx.fillStyle = tg;
      ctx.fillRect(tx, jy + 2, tw * 0.76, tH);
    }

    // ── Outline ──
    ctx.strokeStyle = 'rgba(55,8,38,0.88)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.04, r, r * 1.04, 0, 0, Math.PI * 2); ctx.stroke();

    // Pulse outline glow
    const og = 0.18 + 0.08 * Math.sin(t * 1.05);
    ctx.strokeStyle = `rgba(190,25,72,${og})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.04, r + 5, r * 1.04 + 5, 0, 0, Math.PI * 2); ctx.stroke();

    // Surface cracks
    ctx.strokeStyle = 'rgba(38,0,18,0.65)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.68); ctx.lineTo(-r * 0.33, -r * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r * 0.19, -r * 0.48); ctx.lineTo( r * 0.48,  r * 0.09); ctx.stroke();

    ctx.restore();
  }

  // ── Skull fire ────────────────────────────────────────────────────────────
  function drawSkullFire() {
    const cx  = W / 2;
    const r   = clamp(W * 0.135, 55, 152);
    const bobY = H * 0.22 + Math.sin(t * 0.52) * 7;

    const flameCount = qualityTier >= 2 ? 9 : 6;
    for (let fi = 0; fi < flameCount; fi++) {
      const baseAngle   = (fi / flameCount) * Math.PI + Math.PI;
      const pa = baseAngle + Math.sin(t * 0.65 + fi * 0.42) * 0.14;
      const bx = cx + Math.cos(pa) * (r * 1.04);
      const by = bobY + Math.sin(pa) * (r * 1.04);
      const fH = r * (0.28 + 0.38 * Math.abs(Math.sin(t * 1.9 + fi)));
      const fW = r * (0.16 + 0.10 * Math.sin(t * 1.4 + fi * 0.75));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(pa + Math.PI * 1.5);
      drawFlame(0, 0, fW, fH, 0.58 + 0.28 * Math.sin(t * 1.75 + fi), fi);
      ctx.restore();
    }

    // Side flames (only high quality)
    if (qualityTier >= 1) {
      [-1, 1].forEach((side, si) => {
        const bx = cx + side * r * 1.18;
        const by = bobY + r * 0.28;
        for (let fi = 0; fi < (qualityTier >= 2 ? 3 : 2); fi++) {
          const fH = (r * 0.75 + fi * r * 0.18) * (0.8 + 0.2 * Math.sin(t * 1.45 + fi + si));
          const fW = r * 0.22 + fi * r * 0.04;
          ctx.save();
          ctx.translate(bx + side * fi * 15, by - fi * 8);
          drawFlame(0, 0, fW, fH, 0.48 + 0.22 * Math.sin(t * 2.1 + fi), fi + si * 4);
          ctx.restore();
        }
      });
    }
  }

  function drawFlame(x, y, w, h, alpha, seed) {
    const sw = Math.sin(t * 2.0 + seed * 0.58) * w * 0.28;
    const g  = ctx.createLinearGradient(x, y, x + sw, y - h);
    g.addColorStop(0,    `rgba(255,238,52, ${alpha})`);
    g.addColorStop(0.18, `rgba(255,155, 8, ${alpha * 0.93})`);
    g.addColorStop(0.48, `rgba(255, 36, 8, ${alpha * 0.78})`);
    g.addColorStop(0.78, `rgba(175,  8,55, ${alpha * 0.45})`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w * 0.58, y - h * 0.28, x + sw - w * 0.28, y - h * 0.58, x + sw, y - h);
    ctx.bezierCurveTo(x + sw + w * 0.28, y - h * 0.58, x + w * 0.58, y - h * 0.28, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
  }

  // ── Mini skulls ───────────────────────────────────────────────────────────
  function drawMiniSkulls() {
    scene.miniSkulls.forEach(s => {
      const r = s.size / 2;
      // Depth-based alpha (no CSS filter = no GPU flush)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha * (0.5 + s.depth * 0.5);

      ctx.fillStyle = '#e8d0c8';
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2); ctx.fill();

      [-1, 1].forEach(side => {
        ctx.fillStyle = '#0a0010';
        ctx.beginPath(); ctx.ellipse(side * r * 0.29, -r * 0.07, r * 0.19, r * 0.21, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,75,0,0.65)`;
        ctx.beginPath(); ctx.arc(side * r * 0.29, -r * 0.07, r * 0.09, 0, Math.PI * 2); ctx.fill();
      });

      ctx.fillStyle = '#2a0010';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.19); ctx.lineTo(-r * 0.09, r * 0.36); ctx.lineTo(r * 0.09, r * 0.36);
      ctx.closePath(); ctx.fill();

      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }

  // ── Embers ────────────────────────────────────────────────────────────────
  function drawEmbers() {
    scene.embers.forEach(e => {
      const a = e.life * 0.85;
      if (a < 0.02) return;

      // Single radial gradient per ember (cheap)
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.2);
      g.addColorStop(0,   `hsl(${e.hue},100%,88%)`);
      g.addColorStop(0.32,`hsl(${e.hue},100%,58%)`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle   = g;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 2.2, 0, Math.PI * 2); ctx.fill();
      // Core dot
      ctx.fillStyle = `hsl(${e.hue + 18},100%,90%)`;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  // ── Lightning ─────────────────────────────────────────────────────────────
  function drawLightning() {
    const l = scene.lightning;
    if (!l.active || l.intensity <= 0) return;
    const a = l.intensity;

    ctx.fillStyle = `rgba(165,110,245,${a * 0.055})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    l.bolts.forEach(bolt => {
      ctx.save();
      ctx.shadowBlur   = bolt.branch ? 6 : 18;
      ctx.shadowColor  = `rgba(195,155,250,${a})`;
      ctx.strokeStyle  = `rgba(235,215,255,${a * (bolt.branch ? 0.55 : 0.92)})`;
      ctx.lineWidth    = bolt.branch ? 0.9 : 2.2;
      ctx.lineCap      = 'round';
      ctx.lineJoin     = 'round';
      ctx.beginPath();
      bolt.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.stroke();
      ctx.restore();
    });
  }

  // ── Vignette ──────────────────────────────────────────────────────────────
  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.14, W / 2, H / 2, H * 0.82);
    g.addColorStop(0,   'rgba(0,0,0,0)');
    g.addColorStop(0.58,'rgba(0,0,0,0.10)');
    g.addColorStop(1,   'rgba(0,0,0,0.80)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  function start() {
    if (running) return;
    t = 0; lastTS = performance.now();
    init();
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function observe() {
    const menuEl = document.getElementById('screen-menu');
    if (!menuEl) return;
    if (menuEl.classList.contains('active')) start();
    new MutationObserver(() => menuEl.classList.contains('active') ? start() : stop())
      .observe(menuEl, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
  else observe();

  window.MenuScene = { start, stop };
})();
