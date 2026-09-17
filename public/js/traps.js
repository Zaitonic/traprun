// ============================================
// TRAP RUN — Trap System (Enhanced with Ragebait Mechanics)
// ============================================
const Traps = (() => {

  // Base trap class-like factory
  function createTrap(type, config) {
    return {
      type,
      x: config.x || 0,
      y: config.y || 0,
      w: config.w || 32,
      h: config.h || 32,
      active: true,
      triggered: false,
      timer: 0,
      visible: config.visible !== false,
      deadly: config.deadly !== false,
      ...config
    };
  }

  // A trap should feel like a sudden betrayal, not just a sprite changing state.
  // The player reaction is cosmetic, so surprise never steals control mid-jump.
  function springTrap(intensity = 1) {
    AudioManager.trapTrigger();
    Player.shock(intensity);
    Camera.shake(2 + intensity * 2, 90 + intensity * 35);
  }

  // ── ORIGINAL TRAPS ──────────────────────────

  // ---- HIDDEN SPIKES ----
  function hiddenSpikes(x, y, w = 32, triggerDist = 80) {
    return createTrap('hiddenSpikes', {
      x, y, w, h: 16,
      triggerDist,
      visible: false,
      revealed: false,
      revealTimer: 0,
      revealDuration: 15
    });
  }

  // ---- MOVING SPIKES ----
  function movingSpikes(x, y, endX, endY, speed = 1.5) {
    return createTrap('movingSpikes', {
      x, y, w: 24, h: 24,
      startX: x, startY: y,
      endX, endY, speed,
      progress: 0, direction: 1
    });
  }

  // ---- DISAPPEARING PLATFORM ----
  function disappearingPlatform(x, y, w = 64) {
    return createTrap('disappearingPlatform', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      disappearTimer: 0,
      disappearDelay: 40,
      disappeared: false,
      respawnTimer: 0,
      respawnDelay: 120,
      opacity: 1,
      stepped: false
    });
  }

  // ---- FAKE PLATFORM ----
  function fakePlatform(x, y, w = 64) {
    return createTrap('fakePlatform', {
      x, y, w, h: 16,
      deadly: false,
      solid: false,
      opacity: 1,
      revealed: false
    });
  }

  // ---- FALLING PLATFORM ----
  function fallingPlatform(x, y, w = 64) {
    return createTrap('fallingPlatform', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      startY: y,
      fallDelay: 25,
      fallTimer: 0,
      falling: false,
      fallSpeed: 0,
      stepped: false,
      shaking: false
    });
  }

  // ---- FALLING CEILING ----
  function fallingCeiling(x, y, w = 48, triggerX = null) {
    return createTrap('fallingCeiling', {
      x, y, w, h: 32,
      startY: y,
      triggerX: triggerX || x + w / 2,
      triggerDist: 60,
      fallSpeed: 0,
      falling: false,
      deadly: true
    });
  }

  // ---- MOVING WALL ----
  function movingWall(x, y, h = 64, endX, speed = 1) {
    return createTrap('movingWall', {
      x, y, w: 24, h,
      startX: x, endX, speed,
      moving: false,
      triggerDist: 100,
      deadly: true
    });
  }

  // ---- COLLAPSING FLOOR ----
  function collapsingFloor(x, y, w = 128) {
    return createTrap('collapsingFloor', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      segments: Math.floor(w / 16),
      collapsed: [],
      collapseTimer: 0,
      collapseDelay: 8,
      collapseIndex: 0,
      triggered: false
    });
  }

  // ---- FAKE EXIT ----
  function fakeExit(x, y) {
    return createTrap('fakeExit', {
      x, y, w: 32, h: 48,
      deadly: true,
      visible: true
    });
  }

  // ---- GRAVITY FLIP ZONE ----
  function gravityFlip(x, y, w = 64, h = 200) {
    return createTrap('gravityFlip', {
      x, y, w, h,
      deadly: false,
      visible: true
    });
  }

  // ---- TELEPORT TRAP ----
  function teleportTrap(x, y, destX, destY) {
    return createTrap('teleportTrap', {
      x, y, w: 32, h: 32,
      destX, destY,
      deadly: false,
      cooldown: 0
    });
  }

  // ---- MOVING PLATFORM ----
  function movingPlatform(x, y, w = 64, endX = null, endY = null, speed = 1) {
    return createTrap('movingPlatform', {
      x, y, w, h: 16,
      startX: x, startY: y,
      endX: endX != null ? endX : x,
      endY: endY != null ? endY : y,
      speed,
      progress: 0,
      direction: 1,
      deadly: false,
      solid: true
    });
  }

  // ---- TIMED SPIKES ----
  function timedSpikes(x, y, w = 32, onTime = 60, offTime = 60, offset = 0) {
    return createTrap('timedSpikes', {
      x, y, w, h: 16,
      onTime, offTime, offset,
      timer: offset,
      isOn: false
    });
  }

  // ---- SURPRISE TRAP ----
  function surpriseTrap(x, y, spikeDir = 'up') {
    return createTrap('surpriseTrap', {
      x, y, w: 32, h: 32,
      spikeDir,
      triggered: false,
      triggerDist: 50,
      animTimer: 0,
      animDuration: 10
    });
  }

  // ---- PIXEL SCARE ----
  // A deliberately harmless proximity trap: it interrupts attention with a
  // short full-screen pixel face, but never steals health or player control.
  function pixelScare(x, y, triggerDist = 76, scareStyle = 'eye') {
    return createTrap('pixelScare', {
      x, y, w: 28, h: 28,
      triggerDist,
      scareStyle,
      scareTimer: 0,
      deadly: false
    });
  }

  // ══════════════════════════════════════════════
  // ── NEW RAGEBAIT TRAPS ────────────────────────
  // ══════════════════════════════════════════════

  // ── 1. RUNAWAY EXIT (Moving Door) ─────────────
  // States: IDLE → ALERTED → DODGING → EXHAUSTED (catchable)
  // The exit door sees you coming and RUNS AWAY.
  // After dodgeCount dodges, it gets "tired" and stops.
  function runawayExit(x, y, dodgeCount = 3, dodgeDist = 120, triggerDist = 90, speed = 4) {
    return createTrap('runawayExit', {
      x, y, w: 32, h: 48,
      startX: x, startY: y,
      deadly: false,
      solid: false,
      triggerDist,
      dodgeDist,
      dodgeCount,
      dodgesLeft: dodgeCount,
      // State machine: 'idle' | 'alerted' | 'dodging' | 'exhausted'
      trapState: 'idle',
      alertTimer: 0,
      alertDuration: 20,       // Brief "!" moment before dodging
      dodgeTargetX: x,
      dodgeTargetY: y,
      dodgeProgress: 0,
      dodgeSpeed: speed,
      exhaustedTimer: 0,
      sweatDrops: [],
      eyesPanic: false,
      // Level bounds for dodge clamping
      levelWidth: 800,
      levelHeight: 600
    });
  }

  // ── 2. FALSE GROUND / HOLE SPAWNING ───────────
  // States: SOLID → TRIGGERED → CRUMBLING → OPEN (spikes below)
  // Looks like normal floor. When player crosses a trigger line,
  // the ground BEHIND them crumbles, revealing spikes.
  // "The ground you just walked on? Gone."
  function falseGround(x, y, w = 128, triggerOffsetX = 64, crumbleDir = 'behind') {
    return createTrap('falseGround', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      // Trigger line position (relative to trap x)
      triggerX: x + triggerOffsetX,
      crumbleDir,              // 'behind' | 'ahead' | 'both'
      // State: 'solid' | 'triggered' | 'crumbling' | 'open'
      trapState: 'solid',
      crumbleTimer: 0,
      crumbleDuration: 20,     // frames to fully crumble
      crumbleProgress: 0,      // 0-1
      spikeHeight: 12,
      revealedSegments: [],
      totalSegments: Math.floor(w / 16),
      shakeIntensity: 0,
      playerCrossedRight: false  // which direction player crossed
    });
  }

  // ── 3. INVERT CONTROLS ZONE ───────────────────
  // States: Active zone (always on when player is inside)
  // An invisible zone that swaps left/right controls.
  // Subtle purple particles hint at the zone.
  function invertZone(x, y, w = 100, h = 150) {
    return createTrap('invertZone', {
      x, y, w, h,
      deadly: false,
      solid: false,
      visible: true,
      particleTimer: 0
    });
  }

  // ── 4. LAUNCHPAD / FAKE SAFE ZONE ─────────────
  // States: IDLE → PLAYER_ON → CHARGING → LAUNCHED
  // Looks like a cozy safe platform (maybe with a flag/star).
  // When the player stands on it for 0.5s, it LAUNCHES them
  // straight up into ceiling spikes or out of bounds.
  function launchPad(x, y, w = 64, launchForce = -18, chargeDelay = 30) {
    return createTrap('launchPad', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      launchForce,
      chargeDelay,
      // State: 'idle' | 'charging' | 'launched'
      trapState: 'idle',
      chargeTimer: 0,
      playerOnTop: false,
      shakeIntensity: 0,
      glowTimer: 0,
      launched: false
    });
  }

  // ── 5. SPIKE WAVE ─────────────────────────────
  // A wave of spikes that chases the player across the floor.
  // Triggers when player crosses a point, then spikes emerge
  // sequentially from one side, creating a "wave" effect.
  function spikeWave(x, y, w = 320, triggerX = null, speed = 3, dir = 1) {
    return createTrap('spikeWave', {
      x, y, w, h: 16,
      deadly: false,
      solid: false,
      triggerX: triggerX || x,
      dir,                    // 1 = left-to-right, -1 = right-to-left
      speed,
      // State: 'idle' | 'active'
      trapState: 'idle',
      wavePos: 0,             // current spike reveal position (pixels from start)
      totalSegments: Math.floor(w / 16),
      activeSegments: [],     // which segments have spikes up
      triggered: false
    });
  }

  // ── 6. PHANTOM PLATFORM ──────────────────────
  // States: VISIBLE → FADING → GONE → REAPPEARING
  // Platforms that are SOLID, but start fading the moment
  // you jump OFF them (not onto them). So you can land,
  // but you can never go back.
  function phantomPlatform(x, y, w = 80) {
    return createTrap('phantomPlatform', {
      x, y, w, h: 16,
      deadly: false,
      solid: true,
      // State: 'visible' | 'fading' | 'gone'
      trapState: 'visible',
      fadeTimer: 0,
      fadeDuration: 30,
      opacity: 1,
      playerWasOn: false,
      playerIsOn: false
    });
  }

  // ══════════════════════════════════════════════
  // ── UPDATE FUNCTIONS ──────────────────────────
  // ══════════════════════════════════════════════

  function updateTrap(trap, player, dt) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dist = Math.sqrt((px - (trap.x + trap.w / 2)) ** 2 + (py - (trap.y + trap.h / 2)) ** 2);

    switch (trap.type) {
      // ── Original traps ──
      case 'hiddenSpikes':
        if (!trap.revealed && dist < trap.triggerDist) {
          trap.revealed = true;
          trap.revealTimer = 0;
          springTrap();
        }
        if (trap.revealed && trap.revealTimer < trap.revealDuration) {
          trap.revealTimer++;
          trap.visible = true;
        }
        if (trap.revealed) trap.visible = true;
        break;

      case 'movingSpikes':
        trap.progress += trap.speed * 0.01 * trap.direction;
        if (trap.progress >= 1) { trap.progress = 1; trap.direction = -1; }
        if (trap.progress <= 0) { trap.progress = 0; trap.direction = 1; }
        trap.x = trap.startX + (trap.endX - trap.startX) * trap.progress;
        trap.y = trap.startY + (trap.endY - trap.startY) * trap.progress;
        break;

      case 'disappearingPlatform':
        if (trap.stepped && !trap.disappeared) {
          trap.disappearTimer++;
          trap.opacity = 1 - (trap.disappearTimer / trap.disappearDelay) * 0.6;
          trap.shakeX = (Math.random() - 0.5) * 3;
          if (trap.disappearTimer >= trap.disappearDelay) {
            trap.disappeared = true;
            trap.solid = false;
            trap.opacity = 0;
            trap.respawnTimer = 0;
            Particles.platformBreak(trap.x, trap.y, trap.w);
          }
        }
        if (trap.disappeared) {
          trap.respawnTimer++;
          if (trap.respawnTimer >= trap.respawnDelay) {
            trap.disappeared = false;
            trap.solid = true;
            trap.opacity = 1;
            trap.stepped = false;
            trap.disappearTimer = 0;
            trap.shakeX = 0;
          }
        }
        break;

      case 'fakePlatform':
        if (Physics.aabb(player, trap)) {
          if (!trap.revealed) springTrap(0.9);
          trap.revealed = true;
          trap.opacity = 0.3;
        }
        break;

      case 'fallingPlatform':
        if (trap.stepped && !trap.falling) {
          trap.fallTimer++;
          trap.shaking = true;
          if (trap.fallTimer >= trap.fallDelay) {
            trap.falling = true;
            trap.shaking = false;
            springTrap();
          }
        }
        if (trap.falling) {
          trap.fallSpeed += 0.4;
          trap.y += trap.fallSpeed;
          trap.solid = false;
          if (trap.y > trap.startY + 400) {
            trap.active = false;
          }
        }
        break;

      case 'fallingCeiling':
        if (!trap.falling && Math.abs(px - trap.triggerX) < trap.triggerDist && py > trap.y) {
          trap.falling = true;
          springTrap(1.25);
        }
        if (trap.falling) {
          trap.fallSpeed += 0.5;
          trap.y += trap.fallSpeed;
          if (trap.y > trap.startY + 600) {
            trap.active = false;
          }
        }
        break;

      case 'movingWall':
        if (!trap.moving && dist < trap.triggerDist) {
          trap.moving = true;
          springTrap();
        }
        if (trap.moving) {
          const dir = trap.endX > trap.startX ? 1 : -1;
          trap.x += trap.speed * dir;
          if ((dir > 0 && trap.x >= trap.endX) || (dir < 0 && trap.x <= trap.endX)) {
            trap.x = trap.endX;
          }
        }
        break;

      case 'collapsingFloor':
        if (trap.triggered) {
          trap.collapseTimer++;
          if (trap.collapseTimer >= trap.collapseDelay && trap.collapseIndex < trap.segments) {
            trap.collapsed.push(trap.collapseIndex);
            trap.collapseIndex++;
            trap.collapseTimer = 0;
            Particles.platformBreak(trap.x + (trap.collapseIndex - 1) * 16, trap.y, 16);
          }
          if (trap.collapsed.length >= trap.segments) {
            trap.solid = false;
          }
        }
        break;

      case 'gravityFlip':
        break;

      case 'teleportTrap':
        if (trap.cooldown > 0) trap.cooldown--;
        break;

      case 'movingPlatform': {
        const prevX = trap.x;
        const prevY = trap.y;
        trap.progress += trap.speed * 0.008 * trap.direction;
        if (trap.progress >= 1) { trap.progress = 1; trap.direction = -1; }
        if (trap.progress <= 0) { trap.progress = 0; trap.direction = 1; }
        trap.x = trap.startX + (trap.endX - trap.startX) * trap.progress;
        trap.y = trap.startY + (trap.endY - trap.startY) * trap.progress;
        trap.dx = trap.x - prevX;
        trap.dy = trap.y - prevY;
        break;
      }

      case 'timedSpikes':
        trap.timer++;
        const cycle = trap.onTime + trap.offTime;
        const phase = trap.timer % cycle;
        trap.isOn = phase < trap.onTime;
        trap.deadly = trap.isOn;
        break;

      case 'surpriseTrap':
        if (!trap.triggered && dist < trap.triggerDist) {
          trap.triggered = true;
          trap.animTimer = 0;
          springTrap(1.15);
        }
        if (trap.triggered && trap.animTimer < trap.animDuration) {
          trap.animTimer++;
        }
        if (trap.triggered) {
          trap.deadly = true;
        }
        break;

      case 'pixelScare':
        if (!trap.triggered && dist < trap.triggerDist) {
          trap.triggered = true;
          trap.scareTimer = 0;
          springTrap(1.4);
          if (typeof Renderer !== 'undefined') {
            Renderer.triggerPixelScare(trap.scareStyle);
          }
        }
        if (trap.triggered && trap.scareTimer < 28) trap.scareTimer++;
        break;

      // ══════════════════════════════════════════
      // ── RAGEBAIT TRAP UPDATES ─────────────────
      // ══════════════════════════════════════════

      // ── 1. RUNAWAY EXIT ──
      case 'runawayExit':
        switch (trap.trapState) {
          case 'idle':
            if (dist < trap.triggerDist && trap.dodgesLeft > 0) {
              trap.trapState = 'alerted';
              trap.alertTimer = 0;
              trap.eyesPanic = true;
              springTrap();
            }
            break;

          case 'alerted':
            trap.alertTimer++;
            // Shake in panic
            trap.shakeX = (Math.random() - 0.5) * 4;
            if (trap.alertTimer >= trap.alertDuration) {
              // Calculate dodge direction (away from player)
              const dx = trap.x + trap.w / 2 - px;
              const dy = trap.y + trap.h / 2 - py;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;

              // Dodge mostly horizontally for comedy
              let targetX = trap.x + (dx / len) * trap.dodgeDist;
              let targetY = trap.y + (dy / len) * trap.dodgeDist * 0.3;

              // Clamp within level
              targetX = Math.max(40, Math.min(targetX, trap.levelWidth - 70));
              targetY = Math.max(40, Math.min(targetY, trap.levelHeight - 90));

              trap.dodgeTargetX = targetX;
              trap.dodgeTargetY = targetY;
              trap.dodgeProgress = 0;
              trap.trapState = 'dodging';
              trap.dodgesLeft--;
            }
            break;

          case 'dodging':
            trap.dodgeProgress += 0.06 * trap.dodgeSpeed;
            // Ease-out for comedic "zip away" feel
            const ease = 1 - Math.pow(1 - Math.min(1, trap.dodgeProgress), 3);
            trap.x = trap.startX + (trap.dodgeTargetX - trap.startX) * ease;
            trap.y = trap.startY + (trap.dodgeTargetY - trap.startY) * ease;

            if (trap.dodgeProgress >= 1) {
              trap.startX = trap.dodgeTargetX;
              trap.startY = trap.dodgeTargetY;
              trap.x = trap.dodgeTargetX;
              trap.y = trap.dodgeTargetY;
              trap.shakeX = 0;

              if (trap.dodgesLeft <= 0) {
                trap.trapState = 'exhausted';
                trap.exhaustedTimer = 0;
                // Add sweat drops
                trap.sweatDrops = [
                  { x: -4, y: -5, vy: 0.5, life: 40 },
                  { x: trap.w + 2, y: -3, vy: 0.4, life: 45 }
                ];
              } else {
                trap.trapState = 'idle';
              }
            }
            break;

          case 'exhausted':
            trap.exhaustedTimer++;
            // Gentle panting shake
            trap.shakeX = Math.sin(trap.exhaustedTimer * 0.3) * 1.5;
            // Update sweat drops
            for (const drop of trap.sweatDrops) {
              drop.y += drop.vy;
              drop.life--;
            }
            trap.sweatDrops = trap.sweatDrops.filter(d => d.life > 0);
            break;
        }
        break;

      // ── 2. FALSE GROUND ──
      case 'falseGround':
        switch (trap.trapState) {
          case 'solid':
            // Check if player crosses the trigger line
            if (py > trap.y - 40 && py < trap.y + 20) {
              if (px > trap.triggerX - 5 && px < trap.triggerX + 5) {
                trap.trapState = 'triggered';
                trap.crumbleTimer = 0;
                trap.playerCrossedRight = (player.vx > 0);
                springTrap(1.1);
              }
            }
            break;

          case 'triggered':
            trap.crumbleTimer++;
            trap.shakeIntensity = Math.min(3, trap.crumbleTimer * 0.3);
            if (trap.crumbleTimer >= 8) {
              trap.trapState = 'crumbling';
              trap.crumbleTimer = 0;
            }
            break;

          case 'crumbling': {
            trap.crumbleTimer++;
            trap.crumbleProgress = Math.min(1, trap.crumbleTimer / trap.crumbleDuration);

            // Determine which segments to reveal based on direction
            const totalSeg = trap.totalSegments;
            const revealed = Math.floor(trap.crumbleProgress * totalSeg);
            const triggerSeg = Math.floor((trap.triggerX - trap.x) / 16);

            for (let i = 0; i < revealed; i++) {
              let segIdx;
              if (trap.crumbleDir === 'behind') {
                // Crumble from the side the player came FROM
                if (trap.playerCrossedRight) {
                  segIdx = triggerSeg - 1 - i; // crumble leftward
                } else {
                  segIdx = triggerSeg + i;     // crumble rightward
                }
              } else if (trap.crumbleDir === 'ahead') {
                if (trap.playerCrossedRight) {
                  segIdx = triggerSeg + i;
                } else {
                  segIdx = triggerSeg - 1 - i;
                }
              } else { // 'both'
                segIdx = (i % 2 === 0) ? triggerSeg + Math.floor(i / 2) : triggerSeg - 1 - Math.floor(i / 2);
              }

              if (segIdx >= 0 && segIdx < totalSeg && !trap.revealedSegments.includes(segIdx)) {
                trap.revealedSegments.push(segIdx);
                Particles.platformBreak(trap.x + segIdx * 16, trap.y, 16);
              }
            }

            if (trap.crumbleProgress >= 1) {
              trap.trapState = 'open';
              trap.solid = false;
              trap.deadly = true;
            }

            trap.shakeIntensity = (1 - trap.crumbleProgress) * 3;
            break;
          }

          case 'open':
            // Spikes are now exposed — deadly
            break;
        }
        break;

      // ── 3. INVERT CONTROLS ZONE ──
      case 'invertZone':
        trap.particleTimer++;
        // Spawn subtle particles periodically
        if (trap.particleTimer % 15 === 0) {
          Particles.spawn(
            trap.x + Math.random() * trap.w,
            trap.y + Math.random() * trap.h,
            1,
            {
              colors: ['#9944ff', '#7722dd', '#bb66ff'],
              minSpeed: 0.2, maxSpeed: 0.6,
              minSize: 1, maxSize: 3,
              life: 30, gravity: -0.02,
              shape: 'circle'
            }
          );
        }
        break;

      // ── 4. LAUNCH PAD ──
      case 'launchPad':
        // Detect player on top
        trap.playerOnTop = (
          player.y + player.h >= trap.y &&
          player.y + player.h <= trap.y + 8 &&
          player.x + player.w > trap.x &&
          player.x < trap.x + trap.w &&
          player.vy >= 0
        );

        switch (trap.trapState) {
          case 'idle':
            if (trap.playerOnTop) {
              trap.trapState = 'charging';
              trap.chargeTimer = 0;
            }
            break;

          case 'charging':
            if (!trap.playerOnTop) {
              // Player left, reset
              trap.trapState = 'idle';
              trap.chargeTimer = 0;
              trap.shakeIntensity = 0;
              break;
            }
            trap.chargeTimer++;
            trap.shakeIntensity = (trap.chargeTimer / trap.chargeDelay) * 5;
            trap.glowTimer++;

            if (trap.chargeTimer >= trap.chargeDelay) {
              trap.trapState = 'launched';
              trap.launched = true;
              springTrap(1.8);
            }
            break;

          case 'launched':
            // One-shot, stays launched
            trap.shakeIntensity = 0;
            break;
        }
        break;

      // ── 5. SPIKE WAVE ──
      case 'spikeWave':
        if (trap.trapState === 'idle') {
          // Trigger when player crosses the trigger point
          if (trap.dir > 0 && px > trap.triggerX && py > trap.y - 60) {
            trap.trapState = 'active';
            trap.wavePos = 0;
            springTrap(1.35);
          } else if (trap.dir < 0 && px < trap.triggerX && py > trap.y - 60) {
            trap.trapState = 'active';
            trap.wavePos = 0;
            springTrap(1.35);
          }
        }
        if (trap.trapState === 'active') {
          trap.wavePos += trap.speed;
          // Activate segments as wave passes
          const currentSeg = Math.floor(trap.wavePos / 16);
          for (let i = 0; i <= currentSeg && i < trap.totalSegments; i++) {
            if (!trap.activeSegments.includes(i)) {
              trap.activeSegments.push(i);
            }
          }
          if (currentSeg >= trap.totalSegments) {
            trap.deadly = true;
          }
        }
        break;

      // ── 6. PHANTOM PLATFORM ──
      case 'phantomPlatform':
        trap.playerIsOn = (
          player.y + player.h >= trap.y &&
          player.y + player.h <= trap.y + 8 &&
          player.x + player.w > trap.x &&
          player.x < trap.x + trap.w &&
          player.vy >= 0
        );

        switch (trap.trapState) {
          case 'visible':
            if (trap.playerIsOn) {
              trap.playerWasOn = true;
            }
            // When player LEAVES the platform (was on, now off)
            if (trap.playerWasOn && !trap.playerIsOn) {
              trap.trapState = 'fading';
              trap.fadeTimer = 0;
            }
            break;

          case 'fading':
            trap.fadeTimer++;
            trap.opacity = 1 - (trap.fadeTimer / trap.fadeDuration);
            if (trap.fadeTimer >= trap.fadeDuration) {
              trap.trapState = 'gone';
              trap.solid = false;
              trap.opacity = 0;
              Particles.platformBreak(trap.x, trap.y, trap.w);
            }
            break;

          case 'gone':
            // Platform is gone forever (per level attempt)
            break;
        }
        break;
    }
  }

  // ══════════════════════════════════════════════
  // ── COLLISION CHECKS ──────────────────────────
  // ══════════════════════════════════════════════

  function checkPlayerCollision(trap, player) {
    if (!trap.active) return null;

    switch (trap.type) {
      // ── Original collision checks ──
      case 'hiddenSpikes':
        if (trap.revealed && trap.deadly && Physics.aabb(player, trap)) return 'kill';
        break;

      case 'movingSpikes':
        if (trap.deadly && Physics.aabb(player, trap)) return 'kill';
        break;

      case 'disappearingPlatform':
        if (!trap.disappeared && trap.solid) {
          if (player.y + player.h >= trap.y && player.y + player.h <= trap.y + 8 &&
              player.x + player.w > trap.x && player.x < trap.x + trap.w &&
              player.vy >= 0) {
            trap.stepped = true;
          }
        }
        return null;

      case 'fakePlatform':
        return null;

      case 'fallingPlatform':
        if (trap.solid && !trap.falling) {
          if (player.y + player.h >= trap.y && player.y + player.h <= trap.y + 8 &&
              player.x + player.w > trap.x && player.x < trap.x + trap.w &&
              player.vy >= 0) {
            trap.stepped = true;
          }
        }
        return null;

      case 'fallingCeiling':
        if (trap.deadly && Physics.aabb(player, trap)) return 'kill';
        break;

      case 'movingWall':
        if (trap.deadly && Physics.aabb(player, trap)) return 'kill';
        break;

      case 'collapsingFloor':
        if (trap.solid && !trap.triggered) {
          if (player.y + player.h >= trap.y && player.y + player.h <= trap.y + 8 &&
              player.x + player.w > trap.x && player.x < trap.x + trap.w) {
            trap.triggered = true;
            springTrap();
          }
        }
        return null;

      case 'fakeExit':
        if (Physics.aabb(player, trap)) return 'kill';
        break;

      case 'gravityFlip':
        if (Physics.aabb(player, trap)) return 'gravityFlip';
        break;

      case 'teleportTrap':
        if (trap.cooldown <= 0 && Physics.aabb(player, trap)) {
          trap.cooldown = 60;
          return { action: 'teleport', destX: trap.destX, destY: trap.destY };
        }
        break;

      case 'movingPlatform':
        return null;

      case 'timedSpikes':
        if (trap.isOn && Physics.aabb(player, trap)) return 'kill';
        break;

      case 'surpriseTrap':
        if (trap.triggered && trap.deadly && trap.animTimer >= trap.animDuration && Physics.aabb(player, trap)) {
          return 'kill';
        }
        break;

      case 'pixelScare':
        return null;

      // ══════════════════════════════════════════
      // ── RAGEBAIT COLLISION CHECKS ─────────────
      // ══════════════════════════════════════════

      case 'runawayExit':
        // Only "exits" when exhausted and player touches it
        if (trap.trapState === 'exhausted' && Physics.aabb(player, trap)) {
          return 'runawayExitCaught';
        }
        return null;

      case 'falseGround':
        // Deadly when open (spikes exposed)
        if (trap.trapState === 'open') {
          // Check if player is in the opened spike area
          for (const seg of trap.revealedSegments) {
            const sx = trap.x + seg * 16;
            const spikeRect = { x: sx, y: trap.y, w: 16, h: trap.h + trap.spikeHeight };
            if (Physics.aabb(player, spikeRect)) {
              return 'kill';
            }
          }
        }
        return null;

      case 'invertZone':
        if (Physics.aabb(player, trap)) {
          return 'invertControls';
        }
        return null;

      case 'launchPad':
        if (trap.trapState === 'launched' && !trap.playerLaunched) {
          trap.playerLaunched = true;
          return { action: 'launch', force: trap.launchForce };
        }
        return null;

      case 'spikeWave':
        // Check individual active segments
        for (const seg of trap.activeSegments) {
          const sx = trap.x + seg * 16;
          const spikeRect = { x: sx, y: trap.y, w: 16, h: trap.h };
          if (Physics.aabb(player, spikeRect)) {
            return 'kill';
          }
        }
        return null;

      case 'phantomPlatform':
        return null;
    }

    return null;
  }

  // ══════════════════════════════════════════════
  // ── RENDER FUNCTIONS ──────────────────────────
  // ══════════════════════════════════════════════

  function renderTrap(ctx, trap) {
    if (!trap.active) return;

    switch (trap.type) {
      // ── Original renders ──
      case 'hiddenSpikes':
        if (trap.visible) {
          const alpha = trap.revealTimer < trap.revealDuration ? trap.revealTimer / trap.revealDuration : 1;
          ctx.globalAlpha = alpha;
          drawSpikes(ctx, trap.x, trap.y, trap.w, trap.h, '#ff3d6e');
          ctx.globalAlpha = 1;
        }
        break;

      case 'movingSpikes':
        drawSpikes(ctx, trap.x, trap.y, trap.w, trap.h, '#ff5555');
        ctx.globalAlpha = 0.15;
        drawSpikes(ctx, trap.x - trap.speed * (trap.endX - trap.startX > 0 ? 1 : -1) * 2, trap.y, trap.w, trap.h, '#ff5555');
        ctx.globalAlpha = 1;
        break;

      case 'disappearingPlatform': {
        const sx = trap.shakeX || 0;
        ctx.globalAlpha = trap.opacity;
        ctx.fillStyle = trap.stepped ? '#887744' : '#998855';
        ctx.fillRect(trap.x + sx, trap.y, trap.w, trap.h);
        if (trap.stepped && !trap.disappeared) {
          ctx.strokeStyle = '#553322';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(trap.x + sx + trap.w * 0.3, trap.y);
          ctx.lineTo(trap.x + sx + trap.w * 0.5, trap.y + trap.h);
          ctx.moveTo(trap.x + sx + trap.w * 0.7, trap.y);
          ctx.lineTo(trap.x + sx + trap.w * 0.6, trap.y + trap.h);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }

      case 'fakePlatform':
        ctx.globalAlpha = trap.opacity;
        ctx.fillStyle = '#555570';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#4a4a60';
        ctx.fillRect(trap.x + 2, trap.y + 2, trap.w - 4, trap.h - 4);
        ctx.globalAlpha = 1;
        break;

      case 'fallingPlatform': {
        const sx = trap.shaking ? (Math.random() - 0.5) * 4 : 0;
        ctx.fillStyle = '#886644';
        ctx.fillRect(trap.x + sx, trap.y, trap.w, trap.h);
        if (trap.shaking) {
          ctx.strokeStyle = '#553322';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const cx = trap.x + sx + Math.random() * trap.w;
            ctx.moveTo(cx, trap.y);
            ctx.lineTo(cx + (Math.random() - 0.5) * 10, trap.y + trap.h);
          }
          ctx.stroke();
        }
        break;
      }

      case 'fallingCeiling':
        ctx.fillStyle = '#554444';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#663333';
        for (let i = 0; i < trap.w; i += 12) {
          ctx.fillRect(trap.x + i, trap.y + trap.h - 4, 6, 4);
        }
        break;

      case 'movingWall':
        ctx.fillStyle = '#664444';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#883333';
        ctx.fillRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h - 8);
        break;

      case 'collapsingFloor':
        for (let i = 0; i < trap.segments; i++) {
          if (trap.collapsed.includes(i)) continue;
          const segX = trap.x + i * 16;
          ctx.fillStyle = '#666655';
          ctx.fillRect(segX, trap.y, 15, trap.h);
          ctx.strokeStyle = '#444433';
          ctx.strokeRect(segX, trap.y, 15, trap.h);
        }
        break;

      case 'fakeExit':
        ctx.fillStyle = '#00cc66';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#00aa44';
        ctx.fillRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h - 8);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(trap.x + trap.w - 10, trap.y + trap.h / 2 - 3, 4, 6);
        ctx.fillStyle = 'rgba(255,0,0,0.15)';
        ctx.font = '14px sans-serif';
        ctx.fillText('☠', trap.x + 6, trap.y + trap.h / 2 + 5);
        break;

      case 'gravityFlip':
        ctx.fillStyle = 'rgba(128, 0, 255, 0.08)';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = 'rgba(128, 0, 255, 0.25)';
        for (let i = 0; i < trap.h; i += 30) {
          ctx.beginPath();
          const cx = trap.x + trap.w / 2;
          const cy = trap.y + i + 15;
          ctx.moveTo(cx - 8, cy + 6);
          ctx.lineTo(cx, cy - 6);
          ctx.lineTo(cx + 8, cy + 6);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'teleportTrap': {
        ctx.fillStyle = '#2200aa';
        ctx.beginPath();
        ctx.arc(trap.x + trap.w / 2, trap.y + trap.h / 2, trap.w / 2, 0, Math.PI * 2);
        ctx.fill();
        const time = Date.now() * 0.003;
        ctx.strokeStyle = '#6644ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
          const r = (a / (Math.PI * 4)) * (trap.w / 2);
          const sx = trap.x + trap.w / 2 + Math.cos(a + time) * r;
          const sy = trap.y + trap.h / 2 + Math.sin(a + time) * r;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        break;
      }

      case 'movingPlatform':
        ctx.fillStyle = '#4488aa';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#55aacc';
        ctx.fillRect(trap.x + 2, trap.y + 2, trap.w - 4, trap.h - 4);
        ctx.fillStyle = '#336688';
        for (let i = 8; i < trap.w - 8; i += 12) {
          ctx.fillRect(trap.x + i, trap.y + 6, 4, 4);
        }
        break;

      case 'timedSpikes':
        if (trap.isOn) {
          drawSpikes(ctx, trap.x, trap.y, trap.w, trap.h, '#ff4444');
        } else {
          ctx.fillStyle = '#333344';
          ctx.fillRect(trap.x, trap.y + trap.h - 4, trap.w, 4);
        }
        break;

      case 'surpriseTrap':
        if (trap.triggered) {
          const progress = Math.min(1, trap.animTimer / trap.animDuration);
          ctx.globalAlpha = progress;
          drawSpikeDirection(ctx, trap.x, trap.y, trap.w, trap.h, trap.spikeDir, '#ff3d6e');
          ctx.globalAlpha = 1;
        }
        break;

      case 'pixelScare': {
        const bob = Math.round(Math.sin(Date.now() * 0.009 + trap.x) * 2);
        const fade = trap.triggered ? Math.max(0, 1 - trap.scareTimer / 28) : 0.58;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#270d22';
        ctx.fillRect(trap.x + 2, trap.y + 4 + bob, 24, 20);
        ctx.fillStyle = '#ff4164';
        ctx.fillRect(trap.x + 5, trap.y + 8 + bob, 7, 7);
        ctx.fillRect(trap.x + 16, trap.y + 8 + bob, 7, 7);
        ctx.fillStyle = '#fff0d6';
        ctx.fillRect(trap.x + 7, trap.y + 10 + bob, 2, 2);
        ctx.fillRect(trap.x + 18, trap.y + 10 + bob, 2, 2);
        ctx.fillStyle = '#ffb15d';
        ctx.fillRect(trap.x + 8, trap.y + 19 + bob, 12, 2);
        ctx.restore();
        break;
      }

      // ══════════════════════════════════════════
      // ── RAGEBAIT TRAP RENDERS ─────────────────
      // ══════════════════════════════════════════

      // ── 1. RUNAWAY EXIT ──
      case 'runawayExit': {
        const sx = trap.shakeX || 0;
        const tx = trap.x + sx;
        const ty = trap.y;

        // Door glow (green, same as real exit)
        const time = Date.now() * 0.003;
        const glow = Math.sin(time) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = 0.15 * glow;
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(tx - 6, ty - 6, trap.w + 12, trap.h + 12);
        ctx.restore();

        // Door frame
        ctx.fillStyle = '#006633';
        ctx.fillRect(tx, ty, trap.w, trap.h);
        // Door body
        ctx.fillStyle = trap.trapState === 'exhausted' ? '#668844' : '#00cc66';
        ctx.fillRect(tx + 3, ty + 3, trap.w - 6, trap.h - 3);

        // EYES on the door (the personality!)
        const eyeY = ty + 14;
        const eyeSize = 5;
        // Eyes look at player or panic
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx + 6, eyeY, eyeSize, eyeSize);
        ctx.fillRect(tx + trap.w - 11, eyeY, eyeSize, eyeSize);
        // Pupils
        ctx.fillStyle = '#000000';
        if (trap.trapState === 'alerted') {
          // Wide panic eyes — small pupils
          ctx.fillRect(tx + 8, eyeY + 2, 2, 2);
          ctx.fillRect(tx + trap.w - 9, eyeY + 2, 2, 2);
        } else if (trap.trapState === 'exhausted') {
          // Tired spiral eyes
          ctx.fillStyle = '#444444';
          ctx.font = '7px sans-serif';
          ctx.fillText('x', tx + 7, eyeY + 5);
          ctx.fillText('x', tx + trap.w - 10, eyeY + 5);
        } else {
          ctx.fillRect(tx + 7, eyeY + 1, 3, 3);
          ctx.fillRect(tx + trap.w - 10, eyeY + 1, 3, 3);
        }

        // Alert indicator "!"
        if (trap.trapState === 'alerted') {
          ctx.fillStyle = '#ffff00';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('!', tx + trap.w / 2 - 3, ty - 8);
        }

        // Sweat drops when exhausted
        if (trap.trapState === 'exhausted') {
          ctx.fillStyle = '#66aaff';
          for (const drop of trap.sweatDrops) {
            ctx.globalAlpha = drop.life / 40;
            ctx.beginPath();
            ctx.arc(tx + drop.x, ty + drop.y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // Handle
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(tx + trap.w - 10, ty + trap.h / 2 - 3, 4, 6);

        // Star
        ctx.fillStyle = '#ffcc00';
        ctx.globalAlpha = glow;
        ctx.font = '16px sans-serif';
        ctx.fillText('★', tx + trap.w / 2 - 6, ty - 4);
        ctx.globalAlpha = 1;
        break;
      }

      // ── 2. FALSE GROUND ──
      case 'falseGround': {
        const shk = trap.shakeIntensity || 0;
        for (let i = 0; i < trap.totalSegments; i++) {
          const segX = trap.x + i * 16;
          if (trap.revealedSegments.includes(i)) {
            // Spikes in the hole!
            drawSpikes(ctx, segX, trap.y, 16, trap.spikeHeight, '#ff3d6e');
            // Dark hole behind spikes
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(segX, trap.y + trap.spikeHeight, 16, trap.h);
          } else {
            // Normal-looking ground
            const sx = (trap.trapState === 'triggered') ? (Math.random() - 0.5) * shk : 0;
            ctx.fillStyle = '#333348';
            ctx.fillRect(segX + sx, trap.y, 16, trap.h);
            ctx.fillStyle = '#3d3d55';
            ctx.fillRect(segX + sx, trap.y, 16, 3);
          }
        }
        break;
      }

      // ── 3. INVERT CONTROLS ZONE ──
      case 'invertZone': {
        // Subtle purple tint zone
        const time = Date.now() * 0.002;
        const pulse = Math.sin(time) * 0.02 + 0.05;
        ctx.fillStyle = `rgba(150, 50, 255, ${pulse})`;
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);

        // Border shimmer
        ctx.strokeStyle = `rgba(150, 50, 255, ${pulse * 3})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -time * 30;
        ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
        ctx.setLineDash([]);

        // "?" symbols floating
        ctx.fillStyle = `rgba(180, 100, 255, 0.2)`;
        ctx.font = '12px sans-serif';
        const qy = trap.y + trap.h / 2 + Math.sin(time * 2) * 8;
        ctx.fillText('?', trap.x + trap.w / 2 - 4, qy);
        break;
      }

      // ── 4. LAUNCH PAD ──
      case 'launchPad': {
        const shk = trap.shakeIntensity ? (Math.random() - 0.5) * trap.shakeIntensity : 0;
        const charging = trap.trapState === 'charging';
        const launched = trap.trapState === 'launched';

        // Platform body
        ctx.fillStyle = launched ? '#664400' : (charging ? '#ffaa00' : '#44aa44');
        ctx.fillRect(trap.x + shk, trap.y, trap.w, trap.h);

        // Top edge
        ctx.fillStyle = launched ? '#886600' : (charging ? '#ffcc33' : '#66cc66');
        ctx.fillRect(trap.x + shk, trap.y, trap.w, 4);

        // Decorative flag/marker (looks safe!)
        if (!launched) {
          ctx.fillStyle = '#44aa44';
          ctx.fillRect(trap.x + shk + trap.w / 2 - 1, trap.y - 16, 2, 16);
          // Flag
          ctx.fillStyle = charging ? '#ff4444' : '#ffffff';
          ctx.beginPath();
          ctx.moveTo(trap.x + shk + trap.w / 2 + 1, trap.y - 16);
          ctx.lineTo(trap.x + shk + trap.w / 2 + 12, trap.y - 12);
          ctx.lineTo(trap.x + shk + trap.w / 2 + 1, trap.y - 8);
          ctx.closePath();
          ctx.fill();
        }

        // Charging glow
        if (charging) {
          const chargeProgress = trap.chargeTimer / trap.chargeDelay;
          ctx.fillStyle = `rgba(255, 170, 0, ${chargeProgress * 0.4})`;
          ctx.fillRect(trap.x + shk - 4, trap.y - 4, trap.w + 8, trap.h + 8);
          // Warning arrows
          ctx.fillStyle = `rgba(255, 68, 68, ${chargeProgress})`;
          const arrowY = trap.y - 8 - Math.sin(Date.now() * 0.01) * 4;
          ctx.beginPath();
          ctx.moveTo(trap.x + shk + trap.w / 2 - 6, arrowY + 6);
          ctx.lineTo(trap.x + shk + trap.w / 2, arrowY);
          ctx.lineTo(trap.x + shk + trap.w / 2 + 6, arrowY + 6);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      // ── 5. SPIKE WAVE ──
      case 'spikeWave':
        for (let i = 0; i < trap.totalSegments; i++) {
          const segX = trap.x + i * 16;
          if (trap.activeSegments.includes(i)) {
            // Spikes emerged
            drawSpikes(ctx, segX, trap.y, 16, trap.h, '#ff3d6e');
            // Ground rumble line
            ctx.fillStyle = '#663344';
            ctx.fillRect(segX, trap.y + trap.h, 16, 2);
          } else if (trap.trapState === 'active') {
            // Upcoming segments show subtle cracks
            const nextSeg = Math.floor(trap.wavePos / 16) + 1;
            if (i === nextSeg || i === nextSeg + 1) {
              ctx.fillStyle = '#442233';
              ctx.fillRect(segX + 6, trap.y, 2, trap.h * 0.5);
            }
          }
        }
        break;

      // ── 6. PHANTOM PLATFORM ──
      case 'phantomPlatform': {
        ctx.globalAlpha = trap.opacity;
        // Ethereal platform look
        ctx.fillStyle = '#6666aa';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#8888cc';
        ctx.fillRect(trap.x, trap.y, trap.w, 3);
        // Ghost shimmer
        if (trap.trapState === 'visible' && trap.opacity > 0.5) {
          const time = Date.now() * 0.003;
          ctx.fillStyle = `rgba(150, 150, 220, ${0.15 + Math.sin(time) * 0.1})`;
          ctx.fillRect(trap.x, trap.y - 2, trap.w, trap.h + 4);
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  // ── Drawing helpers ──

  function drawSpikes(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    const spikeW = 8;
    const count = Math.floor(w / spikeW);
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * spikeW, y + h);
      ctx.lineTo(x + i * spikeW + spikeW / 2, y);
      ctx.lineTo(x + (i + 1) * spikeW, y + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSpikeDirection(ctx, x, y, w, h, dir, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    switch (dir) {
      case 'up':
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        break;
      case 'down':
        ctx.moveTo(x, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x + w, y);
        break;
      case 'left':
        ctx.moveTo(x + w, y);
        ctx.lineTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h);
        break;
      case 'right':
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x, y + h);
        break;
    }
    ctx.closePath();
    ctx.fill();
  }

  // Get solid traps for collision (platforms)
  function getSolidTraps(traps) {
    return traps.filter(t =>
      t.active && t.solid && !t.disappeared &&
      t.type !== 'fakePlatform' && t.type !== 'runawayExit'
    ).map(t => ({
      x: t.x + (t.shakeX || 0),
      y: t.y,
      w: t.w,
      h: t.h,
      solid: true,
      trap: t
    }));
  }

  // Reset all traps for level restart
  function resetTraps(traps, originals) {
    for (let i = 0; i < traps.length; i++) {
      Object.assign(traps[i], JSON.parse(JSON.stringify(originals[i])));
    }
  }

  return {
    // Original traps
    hiddenSpikes, movingSpikes, disappearingPlatform, fakePlatform,
    fallingPlatform, fallingCeiling, movingWall, collapsingFloor,
    fakeExit, gravityFlip, teleportTrap, movingPlatform,
    timedSpikes, surpriseTrap, pixelScare,
    // Ragebait traps
    runawayExit, falseGround, invertZone, launchPad,
    spikeWave, phantomPlatform,
    // System
    updateTrap, checkPlayerCollision, renderTrap,
    getSolidTraps, resetTraps
  };
})();
