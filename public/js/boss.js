// ============================================
// TRAP RUN — Final Boss Entity (Level 20 Only)
// "THE FINAL ESCAPE" — Demon Skull Chase Encounter
// ============================================
const FinalBoss = (() => {
  // State machine: 'inactive', 'intro', 'chasing', 'escaping', 'victory', 'dead'
  let state = 'inactive';
  let x = -200;
  let y = 300;
  let targetY = 300;
  let vx = 0;
  let vy = 0;
  let animTime = 0;
  let introTimer = 0;
  const INTRO_DURATION = 90; // ~1.5s at 60fps
  let phase = 1; // 1 to 6
  let roarTimer = 0;
  let biteAnim = 0;
  let dangerIntensity = 0;
  let bannerTimer = 0;
  let bannerText = '';
  let defeatedAlpha = 0;

  // Escape sequence state
  let escapeTimer = 0;
  let escapeDoorX = 0;
  let escapeDoorY = 0;
  let escapeOnComplete = null;
  let escapeFlashTriggered = false;
  const escapeShatterRays = [];
  const escapeShockwaves = [];

  // Boss internal particle pools for fiery trail & smoke
  const particles = [];
  const MAX_BOSS_PARTICLES = 160;

  // Phase configurations along the 4800px corridor
  const PHASES = [
    { startX: 0,    name: 'PHASE 1: THE AWAKENING',    gap: 460, minSpeed: 3.3, catchup: 0.055, shake: 0 },
    { startX: 800,  name: 'PHASE 2: THE CRUMBLING',    gap: 360, minSpeed: 3.6, catchup: 0.065, shake: 1.5 },
    { startX: 1600, name: 'PHASE 3: INFERNAL SURGE',   gap: 270, minSpeed: 3.9, catchup: 0.075, shake: 2.5 },
    { startX: 2400, name: 'PHASE 4: REALITY COLLAPSE', gap: 190, minSpeed: 4.1, catchup: 0.082, shake: 3.5 },
    { startX: 3200, name: 'PHASE 5: THE CATACLYSM',    gap: 130, minSpeed: 4.3, catchup: 0.090, shake: 4.5 },
    { startX: 4000, name: 'PHASE 6: THE FINAL ESCAPE', gap: 75,  minSpeed: 4.5, catchup: 0.098, shake: 6.0 }
  ];

  function start(spawnX, spawnY) {
    state = 'intro';
    introTimer = INTRO_DURATION;
    phase = 1;
    x = spawnX - 320;
    y = spawnY - 60;
    targetY = spawnY - 60;
    vx = 0;
    vy = 0;
    animTime = 0;
    roarTimer = 60;
    dangerIntensity = 0;
    defeatedAlpha = 0;
    bannerTimer = 110;
    bannerText = '⚠️ WARNING: THE BEAST AWAKENS! RUN!';
    particles.length = 0;

    // Reset the adaptive boss layer for a fresh chase attempt.
    if (typeof AudioManager !== 'undefined' && AudioManager.setBossIntensity) {
      AudioManager.setBossIntensity(0, 0);
    }

    // Trigger initial roar sound & screen tremor
    if (typeof Camera !== 'undefined' && Camera.shake) {
      Camera.shake(7, 600);
    }
    playRoarSound(60);
  }

  function stop() {
    state = 'inactive';
    particles.length = 0;
  }

  function onPlayerDeath() {
    state = 'dead';
  }

  function onLevelComplete() {
    state = 'victory';
    defeatedAlpha = 1;
    if (typeof Camera !== 'undefined' && Camera.shake) {
      Camera.shake(12, 1000);
    }
  }

  function startEscape(player, exitPos, onComplete) {
    state = 'escaping';
    escapeTimer = 0;
    escapeDoorX = exitPos ? exitPos.x : (player ? player.x + 30 : 4680);
    escapeDoorY = exitPos ? exitPos.y : 422;
    escapeOnComplete = onComplete;
    escapeFlashTriggered = false;
    escapeShatterRays.length = 0;
    escapeShockwaves.length = 0;
    dangerIntensity = 1;
    defeatedAlpha = 1;

    if (typeof AudioManager !== 'undefined' && AudioManager.startBossEscapeClimax) {
      AudioManager.startBossEscapeClimax();
    }

    if (typeof Camera !== 'undefined' && Camera.shake) {
      Camera.shake(14, 700);
    }
    playRoarSound(55);
  }

  function playBarrierSlamAudio() {
    try {
      if (typeof AudioManager !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const actx = (AudioManager._ctx || new AudioCtx());
        if (actx.state === 'suspended') actx.resume();

        const now = actx.currentTime;

        // 1. Heavy slam impact (sub-bass boom)
        const boomOsc = actx.createOscillator();
        const boomGain = actx.createGain();
        boomOsc.type = 'triangle';
        boomOsc.frequency.setValueAtTime(160, now);
        boomOsc.frequency.exponentialRampToValueAtTime(32, now + 0.6);
        boomGain.gain.setValueAtTime(0.65, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        boomOsc.connect(boomGain);
        boomGain.connect(actx.destination);
        boomOsc.start();
        boomOsc.stop(now + 0.75);

        // 2. Heavy crunch / shockwave burst
        if (AudioManager.playNoise) {
          AudioManager.playNoise(0.45, 0.45);
        }

        // 3. Divine crystal resonance
        const chimeOsc = actx.createOscillator();
        const chimeGain = actx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(960, now);
        chimeOsc.frequency.exponentialRampToValueAtTime(480, now + 1.2);
        chimeGain.gain.setValueAtTime(0.35, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(actx.destination);
        chimeOsc.start();
        chimeOsc.stop(now + 1.3);
      }
    } catch (e) {}
  }

  // Audio helper using Web Audio API via AudioManager context if available
  function playRoarSound(durationFrames = 40) {
    try {
      if (typeof AudioManager !== 'undefined') {
        // Synthesize low demonic rumble/growl
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const actx = (AudioManager._ctx || new AudioCtx());
        if (actx.state === 'suspended') actx.resume();

        const dur = durationFrames / 60;
        const osc = actx.createOscillator();
        const subOsc = actx.createOscillator();
        const gain = actx.createGain();
        const filter = actx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(38, actx.currentTime + dur);

        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(55, actx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(26, actx.currentTime + dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, actx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(120, actx.currentTime + dur);

        gain.gain.setValueAtTime(0.35, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);

        osc.start();
        subOsc.start();
        osc.stop(actx.currentTime + dur);
        subOsc.stop(actx.currentTime + dur);
      }
    } catch (e) {
      // Audio context might be restricted before user click
    }
  }

  function update(dt, player) {
    if (state === 'inactive') return;

    animTime += 0.025;

    // Update intro sequence
    if (state === 'intro') {
      introTimer--;
      // Boss emerges from deep darkness on the left
      const progress = 1 - (introTimer / INTRO_DURATION);
      x += (player.x - 380 - x) * 0.05;
      targetY = player.y - 50;
      y += (targetY - y) * 0.06;

      if (introTimer <= 0) {
        state = 'chasing';
        bannerTimer = 90;
        bannerText = '🔥 DO NOT STOP! ESCAPE NOW! 🔥';
        if (typeof Camera !== 'undefined' && Camera.shake) {
          Camera.shake(6, 450);
        }
        playRoarSound(45);
      }
    } else if (state === 'chasing') {
      // Determine current phase based on player's X coordinate
      let newPhase = 1;
      for (let i = PHASES.length - 1; i >= 0; i--) {
        if (player.x >= PHASES[i].startX) {
          newPhase = i + 1;
          break;
        }
      }

      if (newPhase !== phase) {
        phase = newPhase;
        const cfg = PHASES[phase - 1];
        bannerTimer = 90;
        bannerText = `⚡ ${cfg.name} ⚡`;
        playRoarSound(35);
        if (typeof Camera !== 'undefined' && Camera.shake) {
          Camera.shake(cfg.shake + 3, 400);
        }
      }

      const cfg = PHASES[phase - 1];

      // Smooth vertical tracking of player with sinusoidal floating bob
      targetY = player.y - 45;
      const bob = Math.sin(animTime * 2.8) * 18;
      y += (targetY + bob - y) * 0.06;

      // Relentless horizontal chase:
      // The boss pushes forward at least cfg.minSpeed, and accelerates if the player is far ahead
      const targetGapX = player.x - cfg.gap;
      if (x < targetGapX) {
        const catchSpeed = (targetGapX - x) * cfg.catchup;
        vx = Math.max(cfg.minSpeed, catchSpeed);
      } else {
        // Player is hesitating, stumbling or stuck — boss maintains brutal forward momentum!
        vx = Math.max(cfg.minSpeed, 3.8);
      }

      x += vx;

      // Jaws snapping rhythm (faster as phase increases)
      biteAnim = Math.sin(animTime * (4.5 + phase * 0.8));

      // Calculate danger intensity (0 when far, 1 when boss is right on player)
      const distanceToPlayer = player.x - (x + 70);
      const dangerDist = 300;
      dangerIntensity = Math.max(0, Math.min(1, 1 - (distanceToPlayer / dangerDist)));

      // The soundtrack hears both the distance to the beast and the course
      // progress, giving the chase a continuous rise instead of a static loop.
      if (typeof AudioManager !== 'undefined' && AudioManager.setBossIntensity) {
        AudioManager.setBossIntensity(dangerIntensity, player.x / 4800);
      }

      // Occasional mini-tremors when close
      if (dangerIntensity > 0.6 && Math.random() < 0.15) {
        if (typeof Camera !== 'undefined' && Camera.shake) {
          Camera.shake(2 + dangerIntensity * 3, 120);
        }
      }
    } else if (state === 'victory') {
      // Defeated / collapsing backward into the void
      x -= 3;
      y += 1.5;
      defeatedAlpha = Math.max(0, defeatedAlpha - 0.015);
    } else if (state === 'escaping') {
      escapeTimer++;

      // Player glides safely into sanctuary light
      if (player) {
        player.vx = 1.2;
        player.vy = 0;
        player.x += 0.8;
      }

      // Frames 0 to 45: Boss lunges with all its fury!
      if (escapeTimer < 45) {
        const targetLungeX = escapeDoorX - 60;
        x += (targetLungeX - x) * 0.14 + 2.5;
        targetY = escapeDoorY - 25;
        y += (targetY - y) * 0.08;
        biteAnim = Math.sin(animTime * 12) * 1.5; // frantic chomping
      } else if (escapeTimer === 45) {
        // === FRAME 45: SANCTUARY GATE SLAMS SHUT! ===
        if (!escapeFlashTriggered) {
          escapeFlashTriggered = true;
          if (typeof Renderer !== 'undefined' && Renderer.flash) {
            Renderer.flash('#ffffff', 0.9);
          }
          if (typeof Camera !== 'undefined' && Camera.shake) {
            Camera.shake(24, 1200);
          }
          playBarrierSlamAudio();

          // Shockwaves emanating from gate impact
          escapeShockwaves.push({
            x: escapeDoorX,
            y: escapeDoorY + 24,
            radius: 12,
            maxRadius: 320,
            alpha: 1
          });

          // Divine shatter rays piercing the skull
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const length = 140 + Math.random() * 120;
            escapeShatterRays.push({
              angle,
              length,
              speed: 7 + Math.random() * 4,
              currentLen: 0,
              alpha: 1,
              width: 3 + Math.random() * 4
            });
          }

          // Massive spark & disintegration particle explosion
          for (let p = 0; p < 60; p++) {
            particles.push({
              x: x + 40 + (Math.random() - 0.5) * 70,
              y: y + (Math.random() - 0.5) * 80,
              vx: (Math.random() - 0.8) * 7 - 2,
              vy: (Math.random() - 0.5) * 7,
              size: Math.random() * 12 + 6,
              life: Math.floor(Math.random() * 50 + 35),
              color: Math.random() > 0.4 ? '#ffd700' : (Math.random() > 0.5 ? '#ff3366' : '#00ffff'),
              decay: 0.94
            });
          }
        }
      } else {
        // Frames 46 to 220: Boss recoils into the dark abyss
        x -= 4.5;
        y += Math.sin(escapeTimer * 0.2) * 3 + 0.5;
        biteAnim = -0.5; // open in agonizing defeat
        dangerIntensity = Math.max(0, 1 - (escapeTimer - 45) / 50);
        defeatedAlpha = Math.max(0, 1 - (escapeTimer - 45) / 125);

        for (const ray of escapeShatterRays) {
          ray.currentLen = Math.min(ray.length, ray.currentLen + ray.speed);
          if (escapeTimer > 95) {
            ray.alpha = Math.max(0, ray.alpha - 0.022);
          }
        }

        // Dissolution embers
        if (escapeTimer < 145 && Math.random() < 0.8) {
          particles.push({
            x: x + 20 + Math.random() * 60,
            y: y + (Math.random() - 0.5) * 80,
            vx: -(Math.random() * 4 + 1.5),
            vy: (Math.random() - 0.5) * 3 - 1,
            size: Math.random() * 10 + 4,
            life: Math.floor(Math.random() * 35 + 20),
            color: Math.random() > 0.5 ? '#ffe066' : '#220015',
            decay: 0.93
          });
        }

        if (escapeTimer === 105 && typeof AudioManager !== 'undefined' && AudioManager.victoryFanfare) {
          AudioManager.victoryFanfare();
        }

        if (escapeTimer >= 215) {
          state = 'victory';
          if (typeof escapeOnComplete === 'function') {
            const cb = escapeOnComplete;
            escapeOnComplete = null;
            cb();
          }
        }
      }

      for (let i = escapeShockwaves.length - 1; i >= 0; i--) {
        const sw = escapeShockwaves[i];
        sw.radius += 10;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        if (sw.alpha <= 0) escapeShockwaves.splice(i, 1);
      }
    }

    // Spawn boss fire & smoke particles
    emitParticles(x, y);

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size = Math.max(0.1, p.size * p.decay);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Banner timer
    if (bannerTimer > 0) bannerTimer--;
  }

  function emitParticles(bx, by) {
    if (particles.length >= MAX_BOSS_PARTICLES) return;

    // Embers and fire from eye sockets and horns
    for (let i = 0; i < 2; i++) {
      const isFire = Math.random() > 0.4;
      particles.push({
        x: bx + 50 + (Math.random() - 0.5) * 60,
        y: by + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.7) * 2.5 + (isFire ? 1.2 : -0.8),
        vy: (Math.random() - 0.6) * 2.0 - 0.5,
        size: isFire ? (Math.random() * 8 + 4) : (Math.random() * 14 + 8),
        life: isFire ? Math.floor(Math.random() * 20 + 15) : Math.floor(Math.random() * 30 + 20),
        color: isFire
          ? (Math.random() > 0.5 ? '#ff2200' : '#ff7700')
          : (Math.random() > 0.5 ? 'rgba(40, 5, 20, 0.4)' : 'rgba(20, 0, 10, 0.5)'),
        decay: 0.95
      });
    }
  }

  // Player collision test: does the boss reach or overtake the player?
  function catchesPlayer(player) {
    if (state !== 'chasing') return false;

    // Front edge of boss jaw/claws is approximately x + 72
    const bossFrontX = x + 72;
    const playerBackX = player.x + 4;

    // If player falls behind the boss's front maw
    if (playerBackX <= bossFrontX) {
      // Check vertical reach (boss is giant: 220px tall, covers +/- 110px from y)
      const bossTop = y - 90;
      const bossBottom = y + 100;
      const playerTop = player.y;
      const playerBottom = player.y + player.h;

      if (playerBottom >= bossTop && playerTop <= bossBottom) {
        return true;
      }
    }

    // Also check spectral claw reach (reaching arm at x + 105, y +/- 40)
    const clawX = x + 95;
    if (player.x <= clawX && Math.abs(player.y - y) < 65) {
      return true;
    }

    return false;
  }

  // Render in camera/world space
  function renderWorld(ctx) {
    if (state === 'inactive') return;

    ctx.save();
    if (state === 'victory' || state === 'escaping') {
      ctx.globalAlpha = defeatedAlpha;
    }

    // Render Sanctuary Gate & Celestial Barrier during escape
    if (state === 'escaping') {
      renderSanctuaryBarrier(ctx);
    }

    // 1. Render dark shadowy body trailing off-screen to the left
    const trailGrad = ctx.createLinearGradient(x - 260, y, x + 30, y);
    trailGrad.addColorStop(0, 'rgba(5, 0, 8, 0)');
    trailGrad.addColorStop(0.4, 'rgba(25, 3, 20, 0.85)');
    trailGrad.addColorStop(1, 'rgba(45, 6, 25, 0.95)');
    ctx.fillStyle = trailGrad;

    ctx.beginPath();
    ctx.moveTo(x - 300, y - 180);
    ctx.quadraticCurveTo(x - 100, y - 120 + Math.sin(animTime * 3) * 15, x + 30, y - 70);
    ctx.quadraticCurveTo(x + 50, y, x + 30, y + 70);
    ctx.quadraticCurveTo(x - 100, y + 120 + Math.cos(animTime * 3) * 15, x - 300, y + 180);
    ctx.closePath();
    ctx.fill();

    // 2. Trailing dark spectral ribs / tentacle appendages
    for (let r = 0; r < 4; r++) {
      const ribX = x - 40 - r * 45;
      const ribSpread = 60 + r * 22;
      const ribWiggle = Math.sin(animTime * 3 + r * 1.2) * 14;

      ctx.strokeStyle = 'rgba(70, 10, 30, 0.8)';
      ctx.lineWidth = 6 - r;
      ctx.beginPath();
      ctx.moveTo(ribX, y - 30);
      ctx.quadraticCurveTo(ribX - 25, y - ribSpread + ribWiggle, ribX - 70, y - ribSpread * 0.8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ribX, y + 30);
      ctx.quadraticCurveTo(ribX - 25, y + ribSpread - ribWiggle, ribX - 70, y + ribSpread * 0.8);
      ctx.stroke();
    }

    // 3. Render boss particles (fire & smoke)
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Main Giant Skull Head
    ctx.save();
    ctx.translate(x + 20, y);

    // Glowing aura behind skull
    const skullAura = ctx.createRadialGradient(0, 0, 20, 0, 0, 140);
    skullAura.addColorStop(0, 'rgba(255, 30, 0, 0.55)');
    skullAura.addColorStop(0.5, 'rgba(180, 0, 60, 0.3)');
    skullAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = skullAura;
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.fill();

    // Giant Curved Horns
    ctx.fillStyle = '#18071e';
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 3;

    // Top horn
    ctx.beginPath();
    ctx.moveTo(-15, -50);
    ctx.bezierCurveTo(-10, -110, 40, -135, 75, -120 + Math.sin(animTime * 2) * 6);
    ctx.bezierCurveTo(35, -95, 10, -75, 5, -45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom curved horn
    ctx.beginPath();
    ctx.moveTo(-15, 50);
    ctx.bezierCurveTo(-10, 110, 40, 135, 75, 120 - Math.sin(animTime * 2) * 6);
    ctx.bezierCurveTo(35, 95, 10, 75, 5, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Skull Cranium (Upper Skull)
    const boneGrad = ctx.createRadialGradient(-10, -15, 10, 10, 0, 95);
    boneGrad.addColorStop(0, '#f2e8ea');
    boneGrad.addColorStop(0.5, '#b88a95');
    boneGrad.addColorStop(0.85, '#421626');
    boneGrad.addColorStop(1, '#1b0510');
    ctx.fillStyle = boneGrad;
    ctx.strokeStyle = '#ff5577';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(-45, -45);
    ctx.bezierCurveTo(-40, -95, 45, -95, 55, -40);
    ctx.bezierCurveTo(62, -20, 60, 20, 52, 40);
    ctx.bezierCurveTo(40, 65, 0, 60, -35, 45);
    ctx.bezierCurveTo(-55, 30, -55, -15, -45, -45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brow ridge & bone cracks
    ctx.strokeStyle = '#2b0714';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, -45);
    ctx.lineTo(25, -25);
    ctx.lineTo(18, -10);
    ctx.stroke();

    // Eye Sockets (Sunken & Glowing)
    const eyeY = -12;
    const eyeX = 26;

    // Outer dark socket
    ctx.fillStyle = '#0a0105';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 18, 14, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Blazing Demonic Eye
    const eyeFlicker = Math.sin(animTime * 15) * 0.15 + 0.85;
    const eyeGlow = ctx.createRadialGradient(eyeX + 3, eyeY, 2, eyeX + 3, eyeY, 20 * eyeFlicker);
    eyeGlow.addColorStop(0, '#ffffff');
    eyeGlow.addColorStop(0.25, '#ffe600');
    eyeGlow.addColorStop(0.65, '#ff3700');
    eyeGlow.addColorStop(1, 'rgba(255, 0, 40, 0)');
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(eyeX + 3, eyeY, 19 * eyeFlicker, 0, Math.PI * 2);
    ctx.fill();

    // Slit pupil
    ctx.fillStyle = '#200000';
    ctx.beginPath();
    ctx.ellipse(eyeX + 4, eyeY, 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose cavity
    ctx.fillStyle = '#120208';
    ctx.beginPath();
    ctx.moveTo(42, 6);
    ctx.lineTo(49, 14);
    ctx.lineTo(38, 16);
    ctx.closePath();
    ctx.fill();

    // Upper Teeth
    ctx.fillStyle = '#fff4eb';
    ctx.strokeStyle = '#4a0818';
    ctx.lineWidth = 1.5;
    for (let t = 0; t < 5; t++) {
      const tx = 26 + t * 7;
      const ty = 30 + Math.sin(t * 0.8) * 4;
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty);
      ctx.lineTo(tx + 3, ty);
      ctx.lineTo(tx, ty + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Articulated Lower Jaw (Chomping based on biteAnim)
    const jawOpen = Math.max(0, biteAnim) * 22;
    ctx.save();
    ctx.translate(-5, 34 + jawOpen);

    ctx.fillStyle = '#7a3246';
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.bezierCurveTo(10, 5, 45, 10, 52, -2);
    ctx.lineTo(44, 22);
    ctx.bezierCurveTo(30, 32, 0, 30, -18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower Teeth (Pointed upward)
    ctx.fillStyle = '#fff4eb';
    ctx.strokeStyle = '#4a0818';
    ctx.lineWidth = 1.5;
    for (let t = 0; t < 5; t++) {
      const tx = 18 + t * 7;
      ctx.beginPath();
      ctx.moveTo(tx - 3, 2);
      ctx.lineTo(tx + 3, 2);
      ctx.lineTo(tx, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore(); // jaw

    ctx.restore(); // skull head

    // 5. Demonic Spectral Claws reaching forward towards player
    renderClaws(ctx);

    ctx.restore();
  }

  // Reaching skeletal claws
  function renderClaws(ctx) {
    const clawReach = 45 + Math.sin(animTime * 4) * 20;
    const clawYOffset = Math.cos(animTime * 3) * 18;

    // Top Reaching Claw
    ctx.save();
    ctx.translate(x + 55 + clawReach, y - 25 + clawYOffset);
    drawClawHand(ctx, 1);
    ctx.restore();

    // Bottom Reaching Claw
    ctx.save();
    ctx.translate(x + 40 + clawReach * 0.8, y + 55 - clawYOffset);
    drawClawHand(ctx, -0.9);
    ctx.restore();
  }

  function drawClawHand(ctx, scaleY) {
    ctx.scale(1, scaleY);
    ctx.strokeStyle = '#ff4d6d';
    ctx.fillStyle = '#2a0a18';
    ctx.lineWidth = 3;

    // Palm
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4 sharp curved talons
    for (let f = 0; f < 4; f++) {
      const fa = -0.6 + f * 0.4;
      const fl = 24 + (f === 1 || f === 2 ? 8 : 0);
      const fx = Math.cos(fa) * fl;
      const fy = Math.sin(fa) * fl;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(fx * 0.6, fy - 6, fx, fy);
      ctx.stroke();

      // Sharp talon tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Screen overlay in screen coordinates (fixed UI space)
  function renderOverlay(ctx, screenWidth, screenHeight) {
    if (state === 'inactive') return;

    ctx.save();

    // 1. Left Edge Red/Purple Danger Zone Vignette
    // Ramps up dramatically when the boss gets closer
    const auraAlpha = 0.25 + dangerIntensity * 0.65;
    const auraWidth = 140 + dangerIntensity * 280;

    const auraGrad = ctx.createLinearGradient(0, 0, auraWidth, 0);
    auraGrad.addColorStop(0, `rgba(255, 0, 30, ${auraAlpha})`);
    auraGrad.addColorStop(0.4, `rgba(160, 0, 60, ${auraAlpha * 0.6})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, auraWidth, screenHeight);

    // 2. Full-screen Red Heartbeat Pulse when danger is extreme (phase 4 & 5 or boss very close)
    if (dangerIntensity > 0.5) {
      const pulseAlpha = Math.sin(animTime * 12) * 0.18 * dangerIntensity;
      if (pulseAlpha > 0) {
        ctx.fillStyle = `rgba(255, 10, 30, ${pulseAlpha})`;
        ctx.fillRect(0, 0, screenWidth, screenHeight);
      }
    }

    // 3. Phase Warning Banner at Top of Screen
    if (bannerTimer > 0 && bannerText) {
      const bAlpha = bannerTimer > 20 ? 1 : bannerTimer / 20;
      ctx.save();
      ctx.globalAlpha = bAlpha;

      const barY = 56;
      ctx.fillStyle = 'rgba(15, 0, 8, 0.88)';
      ctx.fillRect(screenWidth / 2 - 280, barY - 22, 560, 44);

      ctx.strokeStyle = phase >= 5 ? '#ff0033' : '#ffaa00';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(screenWidth / 2 - 280, barY - 22, 560, 44);

      ctx.font = '900 18px "Russo One", "Kanit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow effect
      ctx.shadowColor = phase >= 5 ? '#ff0033' : '#ff8800';
      ctx.shadowBlur = 14;
      ctx.fillStyle = phase >= 5 ? '#ff4d6d' : '#ffdd44';
      ctx.fillText(bannerText, screenWidth / 2, barY);
      ctx.restore();
    }

    // 4. Boss Distance Meter (HUD Bar showing distance between boss and player)
    if (state === 'chasing') {
      renderChaseMeter(ctx, screenWidth, screenHeight);
    }

    // 5. Cinematic Letterbox & Victory Escape Banner
    if (state === 'escaping') {
      const barH = Math.min(68, escapeTimer * 2.2);

      // Top Letterbox Bar
      ctx.fillStyle = '#050208';
      ctx.fillRect(0, 0, screenWidth, barH);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, barH);
      ctx.lineTo(screenWidth, barH);
      ctx.stroke();

      // Bottom Letterbox Bar
      ctx.fillRect(0, screenHeight - barH, screenWidth, barH);
      ctx.beginPath();
      ctx.moveTo(0, screenHeight - barH);
      ctx.lineTo(screenWidth, screenHeight - barH);
      ctx.stroke();

      // Cinematic Title Announcement
      if (escapeTimer >= 90) {
        const tAlpha = Math.min(1, (escapeTimer - 90) / 25);
        ctx.save();
        ctx.globalAlpha = tAlpha;

        const centerY = screenHeight * 0.42;

        // Title Glow
        ctx.font = '900 32px "Russo One", "Kanit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 24;

        const titleGrad = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
        titleGrad.addColorStop(0, '#ffffff');
        titleGrad.addColorStop(0.35, '#ffe57f');
        titleGrad.addColorStop(1, '#ffaa00');
        ctx.fillStyle = titleGrad;
        ctx.fillText('⚡ SANCTUARY REACHED ⚡', screenWidth / 2, centerY);

        // Subtitle
        ctx.font = '700 14px "Oxanium", sans-serif';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#e0f8ff';
        ctx.fillText("THE DEVIL'S DOMAIN HAS BEEN SEALED FOREVER", screenWidth / 2, centerY + 36);

        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Visual Chase Proximity Meter at the bottom of the screen
  function renderChaseMeter(ctx, screenWidth, screenHeight) {
    const barW = 260;
    const barH = 14;
    const barX = (screenWidth - barW) / 2;
    const barY = screenHeight - 28;

    ctx.save();
    // Background frame
    ctx.fillStyle = 'rgba(10, 5, 15, 0.85)';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = dangerIntensity > 0.7 ? '#ff0033' : 'rgba(255, 100, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    // Danger gradient bar
    const fillWidth = barW * dangerIntensity;
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#ff9900');
    barGrad.addColorStop(0.6, '#ff2200');
    barGrad.addColorStop(1, '#ff0044');

    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, fillWidth, barH);

    // Meter Label
    ctx.font = '700 10px "Oxanium", sans-serif';
    ctx.fillStyle = dangerIntensity > 0.7 ? '#ff4466' : '#cccccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`BOSS PROXIMITY: ${Math.round(dangerIntensity * 100)}%`, screenWidth / 2, barY - 6);

    ctx.restore();
  }

  function renderSanctuaryBarrier(ctx) {
    const gx = escapeDoorX;
    const gy = escapeDoorY;

    ctx.save();

    // 1. Holy ascension light column
    const colGrad = ctx.createLinearGradient(gx - 30, 0, gx + 30, 0);
    const colAlpha = escapeTimer < 45 ? 0.35 + Math.sin(animTime * 8) * 0.15 : 0.85;
    colGrad.addColorStop(0, 'rgba(255, 230, 120, 0)');
    colGrad.addColorStop(0.5, `rgba(255, 240, 160, ${colAlpha})`);
    colGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = colGrad;
    ctx.fillRect(gx - 45, 0, 90, 600);

    // 2. Gateway Pillars
    ctx.fillStyle = '#1c1522';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.fillRect(gx - 18, gy - 20, 10, 75);
    ctx.strokeRect(gx - 18, gy - 20, 10, 75);
    ctx.fillRect(gx + 26, gy - 20, 10, 75);
    ctx.strokeRect(gx + 26, gy - 20, 10, 75);

    // 3. The Divine Vault Barrier (SLAMMED SHUT)
    if (escapeTimer >= 45) {
      const barrierAlpha = Math.min(1, (escapeTimer - 45) / 10);
      ctx.save();
      ctx.globalAlpha = barrierAlpha;

      // Energy Shield Wall
      const wallGrad = ctx.createLinearGradient(gx - 14, 0, gx - 4, 0);
      wallGrad.addColorStop(0, 'rgba(255, 230, 80, 0.95)');
      wallGrad.addColorStop(0.6, 'rgba(0, 255, 240, 0.9)');
      wallGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(gx - 14, 0, 10, 600);

      // Radiant energy aura
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx - 9, 0);
      ctx.lineTo(gx - 9, 600);
      ctx.stroke();

      // Ancient Sanctuary Seal / Rune Circle
      ctx.beginPath();
      ctx.arc(gx - 9, gy + 24, 48, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(gx - 9, gy + 24, 28, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Rune crosses
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2 + animTime * 1.5;
        const rx = gx - 9 + Math.cos(ang) * 38;
        const ry = gy + 24 + Math.sin(ang) * 38;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 4. Expanding shockwaves
      for (const sw of escapeShockwaves) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x - 9, sw.y, sw.radius, Math.PI * 0.5, Math.PI * 1.5);
        ctx.strokeStyle = `rgba(255, 220, 80, ${sw.alpha * 0.9})`;
        ctx.lineWidth = 5 * sw.alpha;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sw.x - 9, sw.y, sw.radius * 0.8, Math.PI * 0.5, Math.PI * 1.5);
        ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha * 0.8})`;
        ctx.lineWidth = 3 * sw.alpha;
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  return {
    start,
    stop,
    update,
    renderWorld,
    renderOverlay,
    catchesPlayer,
    onPlayerDeath,
    onLevelComplete,
    startEscape,
    get state() { return state; },
    get phase() { return phase; },
    get x() { return x; },
    get y() { return y; }
  };
})();
