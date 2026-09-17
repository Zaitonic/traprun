// ============================================
// TRAP RUN — Original ragebait campaign
//
// Design rhythm:
//   1–5   Teach a lie.
//   6–10  Make the player doubt the lie.
//   11–15 Change the rules after commitment.
//   16–20 Combine everything into short, readable ambushes.
// ============================================
const Levels = (() => {
  const TILE = 32;
  const W = 800;
  const H = 600;

  function plat(x, y, w, h = 16) {
    return { x, y, w, h, solid: true };
  }

  function wall(x, y, h, w = TILE) {
    return { x, y, w, h, solid: true };
  }

  function exit(x, y) {
    return { x, y, w: 32, h: 48 };
  }

  function room(width = W, height = H, floor = true) {
    const platforms = [
      plat(0, 0, width),
      wall(0, 0, height),
      wall(width - TILE, 0, height)
    ];
    if (floor) platforms.unshift(plat(0, height - 16, width));
    return platforms;
  }

  // The moving exit uses the actual room dimensions instead of the trap default.
  function roamingExit(x, y, dodges, dodgeDistance, triggerDistance, speed, width = W, height = H) {
    return {
      ...Traps.runawayExit(x, y, dodges, dodgeDistance, triggerDistance, speed),
      levelWidth: width,
      levelHeight: height
    };
  }

  const levels = [
    // ── ACT I: The game starts lying immediately. ──────────────
    {
      name: 'One Tiny Rule',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // First run is readable: a single floor tile answers the obvious route.
        Traps.surpriseTrap(392, H - 48, 'up')
      ]
    },
    {
      name: 'Floor Warranty Void',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // A normal floor now opens just after it is trusted.
        Traps.falseGround(165, H - 16, 245, 96, 'behind'),
        Traps.hiddenSpikes(565, H - 32, 56, 72),
        Traps.surpriseTrap(690, H - 48, 'up')
      ]
    },
    {
      name: 'Door Number Two',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // The welcoming first door is a penalty for assuming all doors are exits.
        Traps.fakeExit(385, H - 64),
        Traps.fallingCeiling(585, 16, 52, 585),
        Traps.timedSpikes(680, H - 32, 48, 36, 42, 12)
      ]
    },
    {
      name: 'Eyes Up',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // The player learns to run beneath a ceiling only once.
        Traps.fallingCeiling(190, 16, 48, 190),
        Traps.fallingCeiling(385, 16, 48, 385),
        Traps.fallingCeiling(580, 16, 48, 580),
        Traps.hiddenSpikes(704, H - 32, 40, 62)
      ]
    },
    {
      name: 'Platforming Is Optional',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [
        ...room(W, H, false),
        plat(0, H - 16, 150),
        plat(225, H - 112, 88),
        plat(390, H - 192, 88),
        plat(555, H - 112, 88),
        plat(655, H - 16, 145)
      ],
      traps: [
        // The low-looking shortcut has no collision; the high route is real.
        Traps.fakePlatform(260, H - 56, 92),
        Traps.fallingPlatform(225, H - 112, 88),
        Traps.disappearingPlatform(390, H - 192, 88),
        Traps.phantomPlatform(555, H - 112, 88),
        Traps.movingSpikes(500, H - 52, 500, H - 235, 1.5)
      ]
    },

    // ── ACT II: The room reacts after the player commits. ─────
    {
      name: 'Polite Timing',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // A predictable beat at first, then one delayed beat near the finish.
        Traps.timedSpikes(180, H - 32, 56, 36, 46, 0),
        Traps.timedSpikes(345, H - 32, 56, 36, 46, 24),
        Traps.timedSpikes(510, H - 32, 56, 36, 46, 8),
        Traps.surpriseTrap(650, H - 48, 'up'),
        Traps.timedSpikes(710, H - 32, 40, 18, 50, 31)
      ]
    },
    {
      name: 'Borrowed Footing',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, 112),
      platforms: [
        ...room(W, H, false),
        plat(0, H - 16, 138),
        plat(650, 160, 150),
        plat(W - 160, 160, 132)
      ],
      traps: [
        // Each step is usable, but only for the direction it first appears to support.
        Traps.fallingPlatform(170, H - 110, 78),
        Traps.phantomPlatform(315, H - 200, 78),
        Traps.disappearingPlatform(460, H - 290, 78),
        Traps.fallingPlatform(605, H - 380, 78),
        Traps.hiddenSpikes(580, 248, 56, 70)
      ]
    },
    {
      name: 'Wait, That Moves?',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [...room()],
      traps: [
        // Three sweep patterns teach the player to pause—then punish overconfidence.
        Traps.movingSpikes(210, H - 56, 210, 150, 1.8),
        Traps.movingSpikes(445, 150, 445, H - 56, 1.45),
        Traps.movingSpikes(635, H - 56, 635, 210, 2.05),
        Traps.hiddenSpikes(710, H - 32, 40, 58)
      ]
    },
    {
      name: 'Lift With Your Knees',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, 112),
      platforms: [
        ...room(W, H, false),
        plat(0, H - 16, 130),
        plat(W - 160, 160, 132)
      ],
      traps: [
        // A normal moving-platform climb, except the last landing bites back.
        Traps.movingPlatform(145, H - 96, 78, 292, H - 96, 1.15),
        // The climb now has enough clearance for the normal player jump.
        Traps.movingPlatform(300, H - 194, 78, 490, H - 194, 1.0),
        Traps.movingPlatform(492, H - 288, 78, 492, 200, 1.18),
        Traps.timedSpikes(W - 160, 144, 56, 34, 38, 14),
        Traps.surpriseTrap(670, 128, 'up')
      ]
    },
    {
      name: 'Catch Me Then',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(-160, -160),
      platforms: [
        ...room(),
        plat(120, H - 132, 96),
        plat(350, H - 206, 96),
        plat(572, H - 132, 96)
      ],
      traps: [
        // The reward runs away instead of the player.
        roamingExit(690, H - 64, 3, 150, 112, 4.35),
        Traps.hiddenSpikes(285, H - 32, 52, 68),
        Traps.fakePlatform(502, H - 102, 76),
        Traps.fallingCeiling(610, 16, 48, 610)
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // ── ACT III: The Gauntlet Begins (Levels 12–14) ──────────────
    // Design: Familiar traps combine in unexpected ways. Every room
    //   has at least one "gotcha" that punishes the obvious route.
    // ══════════════════════════════════════════════════════════════

    // ── LEVEL 12: "Mind The Gap" ────────────────────────────────
    // Narrow platforms over a deadly gap with moving spikes,
    // a surprise trap on landing, and a moving wall chasing from behind.
    {
      name: 'Mind The Gap',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, H - 64),
      platforms: [
        ...room(W, H, false),
        plat(0, H - 16, 200),
        plat(310, H - 16, 140),
        plat(640, H - 16, 160)
      ],
      traps: [
        // Fake platform baits a shortcut across the first gap — it's not solid.
        Traps.fakePlatform(210, H - 56, 80),
        // Moving spikes patrol the first gap to keep pressure up.
        Traps.movingSpikes(260, H - 56, 260, 200, 1.6),
        // A surprise spike on the middle platform.
        Traps.surpriseTrap(370, H - 48, 'up'),
        // Hidden spikes guard the exit approach.
        Traps.hiddenSpikes(610, H - 32, 48, 62),
        // A moving wall chases from behind if you linger near exit.
        Traps.movingWall(530, H - 90, 74, 640, 1.3)
      ]
    },

    // ── LEVEL 13: "Ceiling Is Ground" ───────────────────────────
    // A gravity-flip zone covers the entire middle section. The exit
    // is on the ceiling, so you must ride the flip upward—but fake
    // platforms and timed spikes make the inverted section treacherous.
    {
      name: 'Ceiling Is Ground',
      width: W, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(W - 80, 48),
      platforms: [
        ...room(),
        plat(120, H - 120, 90),
        // Ceiling platforms (for when gravity is flipped)
        plat(350, 80, 100),
        plat(540, 80, 90),
        plat(W - 160, 80, 128)
      ],
      traps: [
        // Gravity flip covers the central gauntlet.
        Traps.gravityFlip(210, 16, 440, H - 32),
        // Fake platform tempts you to skip the climb — you fall through.
        Traps.fakePlatform(280, H - 180, 80),
        // Hidden spikes on the first real platform.
        Traps.hiddenSpikes(145, H - 136, 40, 55),
        // Moving spikes patrol the gravity zone vertically.
        Traps.movingSpikes(320, 120, 320, H - 80, 1.4),
        Traps.movingSpikes(500, H - 80, 500, 120, 1.6),
        // Timed spikes on the ceiling platforms.
        Traps.timedSpikes(370, 64, 40, 22, 30, 0),
        Traps.timedSpikes(555, 64, 36, 22, 30, 16),
        // Surprise spike right before the exit.
        Traps.surpriseTrap(W - 100, 62, 'down'),
        // Falling ceiling block triggered as you approach the exit.
        Traps.fallingCeiling(W - 120, 16, 48, W - 100)
      ]
    },

    // ── LEVEL 14: "Portal Roulette" ─────────────────────────────
    // Three teleporters form a chain. Two send you backward; one
    // advances you. A fake exit punishes guessing wrong. The real
    // exit is behind a disappearing platform gauntlet.
    {
      name: 'Portal Roulette',
      width: 1000, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(920, H - 64),
      platforms: [
        ...room(1000, H, false),
        plat(0, H - 16, 160),
        plat(200, H - 96, 80),
        plat(340, H - 160, 80),
        plat(480, H - 96, 80),
        plat(600, H - 16, 100),
        plat(740, H - 96, 80),
        plat(860, H - 16, 140)
      ],
      traps: [
        // Teleporter 1: sends you forward (correct choice).
        Traps.teleportTrap(220, H - 128, 610, H - 48),
        // Teleporter 2: sends you BACK to start.
        Traps.teleportTrap(360, H - 192, 70, H - 48),
        // Teleporter 3: sends you into a spike trap area.
        Traps.teleportTrap(500, H - 128, 350, H - 48),
        // Fake exit baits players who take the obvious forward path.
        Traps.fakeExit(690, H - 64),
        // Spike wave triggers when crossing the "safe" final platform.
        Traps.spikeWave(860, H - 16, 140, 870, 2.5, 1),
        // Disappearing platforms on the real route.
        Traps.disappearingPlatform(740, H - 96, 80),
        // Falling ceilings over the teleporter approach.
        Traps.fallingCeiling(210, 16, 48, 230),
        Traps.fallingCeiling(490, 16, 48, 510),
        // Hidden spikes between the platforms.
        Traps.hiddenSpikes(320, H - 32, 40, 60),
        // Pixel scares to build anxiety.
        Traps.pixelScare(160, H - 70, 72, 'skull'),
        Traps.pixelScare(440, H - 140, 70, 'eye')
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // ── ACT III-B: The Difficulty Wall (Levels 15–17) ────────────
    // Design: Multiple phases per level. The player must learn a
    //   pattern, then execute it while new threats layer on top.
    //   Layouts are larger and more maze-like.
    // ══════════════════════════════════════════════════════════════

    // ── LEVEL 15: "The Floor Forgets" ───────────────────────────
    // A long hallway where the floor crumbles behind you in waves.
    // Spike waves chase from behind. Fake platforms tempt shortcuts
    // that lead to death pits. The exit is a runaway door.
    {
      name: 'The Floor Forgets',
      width: 1400, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(-160, -160),     // Hidden — runaway exit is the real goal
      platforms: [
        ...room(1400, H, false),
        plat(0, H - 16, 120),
        plat(160, H - 16, 100),
        plat(300, H - 16, 100),
        plat(440, H - 16, 100),
        plat(580, H - 100, 80),
        plat(700, H - 16, 100),
        plat(840, H - 100, 80),
        plat(960, H - 16, 100),
        plat(1100, H - 16, 140),
        plat(1280, H - 16, 120)
      ],
      traps: [
        // Spike waves chase behind you across each floor section.
        Traps.spikeWave(160, H - 16, 100, 180, 2.0, 1),
        Traps.spikeWave(300, H - 16, 100, 320, 2.2, 1),
        Traps.spikeWave(440, H - 16, 100, 460, 2.4, 1),
        // False ground section — looks safe, crumbles ahead.
        Traps.falseGround(700, H - 16, 100, 60, 'ahead'),
        // Fake platforms tempt mid-air shortcuts.
        Traps.fakePlatform(230, H - 80, 70),
        Traps.fakePlatform(510, H - 60, 60),
        // Falling platforms — briefly solid then drop.
        Traps.fallingPlatform(580, H - 100, 80),
        Traps.fallingPlatform(840, H - 100, 80),
        // Moving spikes patrol between sections.
        Traps.movingSpikes(650, H - 56, 650, 200, 1.8),
        Traps.movingSpikes(920, 200, 920, H - 56, 1.6),
        // Timed spikes on the final platform.
        Traps.timedSpikes(1120, H - 32, 48, 20, 24, 0),
        Traps.timedSpikes(1200, H - 32, 40, 20, 24, 14),
        // The REAL exit: a runaway door that requires 4 dodges to catch.
        roamingExit(1300, H - 64, 4, 180, 100, 3.8, 1400, H),
        // Pixel scares to keep pressure up.
        Traps.pixelScare(250, H - 70, 68, 'teeth'),
        Traps.pixelScare(550, H - 70, 68, 'skull'),
        Traps.pixelScare(1050, H - 70, 70, 'eye')
      ]
    },

    // ── LEVEL 16: "Comfort Zone" ────────────────────────────────
    // An elaborate tower climb where every "safe" resting spot is
    // actually a launch pad. The player must ride launch pads upward
    // while dodging moving spikes, but staying too long on any
    // platform sends you flying into ceiling hazards.
    {
      name: 'Comfort Zone',
      width: W, height: 1200,
      spawn: { x: 60, y: 1120 },
      exit: exit(W - 80, 64),
      platforms: [
        ...room(W, 1200, false),
        plat(0, 1184, 180),
        // Ascending platforms (most are launch pads)
        plat(250, 1050, 80),
        plat(500, 930, 80),
        plat(200, 810, 80),
        plat(500, 690, 80),
        plat(250, 570, 80),
        plat(500, 450, 80),
        plat(200, 330, 80),
        plat(500, 210, 80),
        plat(W - 160, 112, 128)
      ],
      traps: [
        // Launch pads disguised as safe resting platforms — quick charge!
        Traps.launchPad(250, 1050, 80, -14, 18),
        Traps.launchPad(500, 930, 80, -15, 16),
        Traps.launchPad(200, 810, 80, -14, 20),
        Traps.launchPad(500, 690, 80, -16, 14),
        // These upper ones are real platforms (reward for learning the pattern).
        // Moving spikes weave between the climb path.
        Traps.movingSpikes(380, 1000, 380, 850, 1.5),
        Traps.movingSpikes(350, 750, 350, 600, 1.7),
        Traps.movingSpikes(380, 500, 380, 350, 1.4),
        Traps.movingSpikes(350, 250, 350, 150, 1.8),
        // Timed spikes on the real safe platforms.
        Traps.timedSpikes(260, 554, 40, 18, 28, 0),
        Traps.timedSpikes(510, 434, 40, 18, 28, 12),
        Traps.timedSpikes(210, 314, 40, 18, 28, 6),
        // Hidden spikes near the exit.
        Traps.hiddenSpikes(620, 170, 48, 56),
        // Falling ceilings triggered during the upper climb.
        Traps.fallingCeiling(300, 16, 52, 270),
        Traps.fallingCeiling(550, 16, 52, 520),
        // Phantom platforms that vanish after you leave them.
        Traps.phantomPlatform(500, 210, 80),
        // Pixel scares at key stress points.
        Traps.pixelScare(270, 990, 70, 'skull'),
        Traps.pixelScare(520, 870, 70, 'eye'),
        Traps.pixelScare(220, 750, 68, 'teeth'),
        Traps.pixelScare(520, 630, 68, 'skull')
      ]
    },

    // ── LEVEL 17: "Trust Issues" ────────────────────────────────
    // A wide gauntlet with two paths. The "easy" lower path is full
    // of fake exits and false ground. The "hard" upper path through
    // moving platforms and an invert zone is the real route. Both
    // paths have their own traps. Pixel scares and surprises abound.
    {
      name: 'Trust Issues',
      width: 1200, height: 800,
      spawn: { x: 60, y: 720 },
      exit: exit(1120, 720),
      platforms: [
        ...room(1200, 800, false),
        // Ground level — the "easy" path (trap-laden).
        plat(0, 784, 200),
        plat(250, 784, 120),
        plat(420, 784, 120),
        plat(590, 784, 120),
        plat(760, 784, 120),
        plat(1050, 784, 150),
        // Upper path — the real route (challenging but honest).
        plat(140, 600, 100),
        plat(310, 510, 90),
        plat(500, 420, 90),
        plat(690, 510, 90),
        plat(870, 600, 100),
        plat(1050, 700, 100),
        plat(1050, 784, 150)
      ],
      traps: [
        // ── LOWER PATH TRAPS (punish the "easy" route) ──
        // Fake exits everywhere to troll players.
        Traps.fakeExit(290, 784 - 48),
        Traps.fakeExit(640, 784 - 48),
        // False ground sections that crumble.
        Traps.falseGround(420, 784, 120, 60, 'both'),
        // Spike wave across the lower corridor.
        Traps.spikeWave(250, 784, 120, 260, 2.8, 1),
        // Hidden spikes at tempting spots.
        Traps.hiddenSpikes(800, 768, 48, 58),
        Traps.hiddenSpikes(580, 768, 40, 58),

        // ── UPPER PATH TRAPS (challenging but fair) ──
        // Disappearing platforms — you must keep moving.
        Traps.disappearingPlatform(310, 510, 90),
        Traps.disappearingPlatform(690, 510, 90),
        // Moving spikes guard the transitions.
        Traps.movingSpikes(230, 550, 230, 450, 1.5),
        Traps.movingSpikes(600, 460, 600, 550, 1.7),
        Traps.movingSpikes(800, 550, 800, 450, 1.4),
        // Timed spikes on the landing platforms.
        Traps.timedSpikes(160, 584, 40, 16, 28, 0),
        Traps.timedSpikes(890, 584, 40, 16, 28, 18),

        // ── SHARED HAZARDS ──
        // Moving walls that push from both sides.
        Traps.movingWall(930, 700, 84, 1040, 1.0),
        // Pixel scares throughout.
        Traps.pixelScare(180, 650, 72, 'eye'),
        Traps.pixelScare(400, 460, 68, 'skull'),
        Traps.pixelScare(750, 460, 68, 'teeth'),
        Traps.pixelScare(960, 720, 72, 'eye'),
        // Surprise traps.
        Traps.surpriseTrap(1080, 748, 'up'),
        Traps.surpriseTrap(480, 388, 'up')
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // ── ACT IV: The Nightmare Zone (Levels 18–20) ────────────────
    // Design: Massive maps, every mechanic combined, multi-phase
    //   sections, maximum trolling. Deaths should feel "I should
    //   have seen that coming" — never truly random.
    // ══════════════════════════════════════════════════════════════

    // ── LEVEL 18: "Rush Hour From Hell" ─────────────────────────
    // A massive horizontal gauntlet. Three distinct phases:
    //   Phase 1: Sprint across crumbling floor with spike waves chasing.
    //   Phase 2: Platforming over a pit with invert zone + moving spikes.
    //   Phase 3: A fake exit, then backtrack through a gravity flip to the real one.
    {
      name: 'Rush Hour From Hell',
      width: 1800, height: H,
      spawn: { x: 60, y: H - 80 },
      exit: exit(1400, 48),
      platforms: [
        ...room(1800, H, false),
        // Phase 1: Crumbling sprint (0–600)
        plat(0, H - 16, 140),
        plat(180, H - 16, 120),
        plat(340, H - 16, 120),
        plat(500, H - 16, 100),
        // Phase 2: Platforming pit (600–1100)
        plat(650, H - 90, 70),
        plat(780, H - 160, 70),
        plat(910, H - 90, 70),
        plat(1040, H - 16, 80),
        // Phase 3: Gravity flip section (1100–1800)
        plat(1160, H - 16, 100),
        plat(1300, H - 16, 100),
        // Ceiling platforms for gravity flip
        plat(1300, 80, 120),
        plat(1460, 80, 120),
        plat(1620, H - 16, 180)
      ],
      traps: [
        // ── Phase 1: Sprint ──
        Traps.spikeWave(180, H - 16, 120, 200, 3.0, 1),
        Traps.spikeWave(340, H - 16, 120, 360, 3.2, 1),
        Traps.falseGround(500, H - 16, 100, 50, 'behind'),
        Traps.fallingCeiling(250, 16, 56, 270),
        Traps.fallingCeiling(420, 16, 56, 440),
        Traps.surpriseTrap(560, H - 48, 'up'),

        // ── Phase 2: Pit platforming ──
        Traps.disappearingPlatform(650, H - 90, 70),
        Traps.movingSpikes(720, H - 50, 720, 200, 2.0),
        Traps.movingSpikes(860, 200, 860, H - 50, 1.8),
        Traps.timedSpikes(920, H - 106, 40, 14, 22, 0),
        Traps.fallingPlatform(780, H - 160, 70),
        Traps.phantomPlatform(910, H - 90, 70),

        // ── Phase 3: Fake exit & gravity flip ──
        // Fake exit at floor level baits you.
        Traps.fakeExit(1200, H - 64),
        // Gravity flip zone — you need to "fall" to the ceiling.
        Traps.gravityFlip(1250, 16, 340, H - 32),
        // Timed spikes on the ceiling platforms.
        Traps.timedSpikes(1320, 64, 40, 16, 26, 0),
        Traps.timedSpikes(1480, 64, 40, 16, 26, 14),
        // Moving spikes in the gravity zone.
        Traps.movingSpikes(1400, H - 80, 1400, 120, 1.6),
        // Hidden spikes near the real exit.
        Traps.hiddenSpikes(1580, H - 32, 44, 56),
        // Pixel scares throughout.
        Traps.pixelScare(150, H - 70, 72, 'skull'),
        Traps.pixelScare(450, H - 70, 70, 'teeth'),
        Traps.pixelScare(800, H - 200, 68, 'eye'),
        Traps.pixelScare(1100, H - 70, 70, 'skull'),
        Traps.pixelScare(1500, 140, 68, 'teeth')
      ]
    },

    // ── LEVEL 19: "Tower of Torment" ────────────────────────────
    // A massive vertical tower. Every floor has a different trap
    // theme. Launch pads send you up — sometimes into ceiling hazards.
    // Invert zones flip your controls mid-jump. Phantom platforms
    // vanish behind you. The exit is a runaway door at the very top.
    {
      name: 'Tower of Torment',
      width: W, height: 1600,
      spawn: { x: 60, y: 1520 },
      exit: exit(-160, -160),     // Hidden — runaway exit is the real goal
      platforms: [
        ...room(W, 1600, false),
        // Floor 1: Ground (1600–1400)
        plat(0, 1584, 160),
        plat(250, 1480, 90),
        plat(500, 1400, 90),
        // Floor 2: Moving platforms (1400–1100)
        plat(200, 1280, 80),
        plat(500, 1160, 80),
        // Floor 3: Invert hell (1100–800)
        plat(100, 1040, 80),
        plat(400, 940, 80),
        plat(600, 840, 80),
        // Floor 4: Phantom gauntlet (800–500)
        plat(200, 720, 80),
        plat(500, 620, 80),
        plat(200, 520, 80),
        // Floor 5: Final push (500–100)
        plat(500, 400, 90),
        plat(200, 280, 90),
        plat(500, 180, 90),
        plat(W - 160, 112, 128)
      ],
      traps: [
        // ── Floor 1: Learning the climb ──
        Traps.fallingPlatform(250, 1480, 90),
        Traps.hiddenSpikes(460, 1540, 48, 58),
        Traps.surpriseTrap(520, 1368, 'up'),
        Traps.movingSpikes(380, 1450, 380, 1350, 1.4),

        // ── Floor 2: Moving platform madness ──
        Traps.movingPlatform(300, 1340, 70, 500, 1340, 1.0),
        Traps.movingPlatform(200, 1220, 70, 450, 1220, 0.9),
        Traps.launchPad(500, 1160, 80, -13, 20),
        Traps.timedSpikes(210, 1264, 40, 18, 24, 0),
        Traps.movingSpikes(600, 1300, 600, 1180, 1.6),

        // ── Floor 3: Spike alley ──
        Traps.disappearingPlatform(400, 940, 80),
        Traps.movingSpikes(300, 1000, 300, 880, 1.5),
        Traps.movingSpikes(550, 880, 550, 1000, 1.7),
        Traps.fallingCeiling(420, 800, 48, 430),
        Traps.pixelScare(130, 980, 68, 'eye'),
        Traps.pixelScare(430, 880, 68, 'skull'),

        // ── Floor 4: Phantom platforms ──
        Traps.phantomPlatform(200, 720, 80),
        Traps.phantomPlatform(500, 620, 80),
        Traps.phantomPlatform(200, 520, 80),
        Traps.timedSpikes(380, 700, 36, 14, 22, 0),
        Traps.timedSpikes(350, 500, 36, 14, 22, 10),
        Traps.movingSpikes(400, 680, 400, 540, 1.8),
        Traps.pixelScare(220, 660, 66, 'teeth'),
        Traps.pixelScare(520, 560, 66, 'eye'),

        // ── Floor 5: The final push ──
        Traps.fallingPlatform(500, 400, 90),
        Traps.launchPad(200, 280, 90, -15, 14),
        Traps.movingSpikes(350, 350, 350, 200, 2.0),
        Traps.hiddenSpikes(480, 240, 44, 52),
        Traps.fallingCeiling(300, 80, 52, 280),
        Traps.surpriseTrap(W - 120, 80, 'down'),
        // The runaway exit at the very top — 5 dodges!
        roamingExit(W - 100, 64, 5, 160, 90, 4.5, W, 1600),
        // Final pixel scares.
        Traps.pixelScare(520, 340, 68, 'skull'),
        Traps.pixelScare(220, 220, 66, 'teeth'),
        Traps.pixelScare(620, 130, 64, 'eye')
      ]
    },

    // ── LEVEL 19: "Read The Room" ───────────────────────────────
    // The ultimate finale. A massive map combining EVERY mechanic.
    // Five distinct sections, each a mini-gauntlet:
    //   1. False ground sprint with spike waves
    //   2. Tower climb with launch pads and phantom platforms
    //   3. Gravity flip maze with invert controls
    //   4. Gauntlet of fake exits and teleport loops
    //   5. Final runaway exit chase on narrow platforms
    // The level is designed to test everything the player has learned.
    {
      name: 'Read The Room',
      width: 2000, height: 1200,
      spawn: { x: 60, y: 1120 },
      exit: exit(-160, -160),     // Hidden — runaway exit is the real goal
      platforms: [
        ...room(2000, 1200, false),

        // Section 1: False ground sprint (x: 0–500)
        plat(0, 1184, 140),
        plat(180, 1184, 120),
        plat(340, 1184, 120),

        // Section 2: Tower climb (x: 500–800, y: 1200–600)
        plat(500, 1184, 100),
        plat(600, 1080, 80),
        plat(500, 960, 80),
        plat(650, 840, 80),
        plat(500, 720, 80),
        plat(650, 620, 100),

        // Section 3: Gravity flip bridge (x: 800–1200, y: 400–700)
        plat(780, 620, 100),
        plat(920, 620, 80),
        // Ceiling platforms for gravity flip
        plat(1020, 420, 100),
        plat(1160, 420, 100),

        // Section 4: Fake exit gauntlet (x: 1200–1600, y: 400–700)
        plat(1300, 620, 80),
        plat(1420, 620, 80),
        plat(1540, 620, 80),
        plat(1300, 500, 80),
        plat(1540, 500, 80),

        // Section 5: Final chase (x: 1600–2000, y: 200–500)
        plat(1660, 500, 70),
        plat(1770, 420, 60),
        plat(1870, 340, 60),
        plat(1750, 260, 60),
        plat(1870, 200, 130)
      ],
      traps: [
        // ═══════════════════════════════════════════
        // Section 1: "The Sprint" — false ground + spike waves
        // ═══════════════════════════════════════════
        Traps.falseGround(180, 1184, 120, 60, 'behind'),
        Traps.spikeWave(340, 1184, 120, 360, 3.5, 1),
        Traps.fallingCeiling(200, 1100, 56, 220),
        Traps.fallingCeiling(380, 1100, 56, 400),
        Traps.hiddenSpikes(460, 1152, 48, 54),
        Traps.pixelScare(150, 1120, 72, 'skull'),
        Traps.surpriseTrap(480, 1152, 'up'),

        // ═══════════════════════════════════════════
        // Section 2: "The Climb" — launch pads + phantom platforms
        // ═══════════════════════════════════════════
        Traps.launchPad(600, 1080, 80, -14, 16),
        Traps.phantomPlatform(500, 960, 80),
        Traps.launchPad(650, 840, 80, -15, 14),
        Traps.phantomPlatform(500, 720, 80),
        Traps.movingSpikes(570, 1040, 570, 880, 1.6),
        Traps.movingSpikes(580, 780, 580, 660, 1.8),
        Traps.timedSpikes(660, 604, 40, 16, 24, 0),
        Traps.fallingCeiling(550, 600, 48, 580),
        Traps.pixelScare(620, 1020, 66, 'eye'),
        Traps.pixelScare(520, 900, 66, 'teeth'),
        Traps.pixelScare(670, 780, 66, 'skull'),

        // ═══════════════════════════════════════════
        // Section 3: "The Flip" — gravity maze
        // ═══════════════════════════════════════════
        Traps.gravityFlip(960, 380, 280, 260),
        Traps.disappearingPlatform(920, 620, 80),
        Traps.movingSpikes(1000, 600, 1000, 440, 1.5),
        Traps.movingSpikes(1130, 440, 1130, 600, 1.7),
        Traps.timedSpikes(1040, 404, 40, 14, 24, 6),
        Traps.timedSpikes(1180, 404, 40, 14, 24, 18),
        Traps.pixelScare(940, 560, 66, 'eye'),
        Traps.pixelScare(1100, 480, 64, 'teeth'),

        // ═══════════════════════════════════════════
        // Section 4: "The Deception" — fake exits + teleport traps
        // ═══════════════════════════════════════════
        // Three fake exits — only the teleporter leads forward.
        Traps.fakeExit(1320, 620 - 48),
        Traps.fakeExit(1560, 620 - 48),
        Traps.fakeExit(1320, 500 - 48),
        // Correct teleporter (disguised among the fake exits).
        Traps.teleportTrap(1560, 468, 1670, 468),
        // Spike wave across the fake exit platforms.
        Traps.spikeWave(1420, 620, 80, 1430, 2.5, 1),
        // Moving walls close in.
        Traps.movingWall(1250, 540, 80, 1350, 1.2),
        // Hidden spikes between platforms.
        Traps.hiddenSpikes(1430, 588, 40, 54),
        Traps.pixelScare(1350, 560, 66, 'skull'),
        Traps.pixelScare(1500, 460, 64, 'eye'),
        Traps.surpriseTrap(1560, 590, 'up'),

        // ═══════════════════════════════════════════
        // Section 5: "The Final Chase" — narrow platforms + runaway exit
        // ═══════════════════════════════════════════
        Traps.fallingPlatform(1660, 500, 70),
        Traps.disappearingPlatform(1770, 420, 60),
        Traps.timedSpikes(1880, 324, 40, 12, 20, 0),
        Traps.fallingPlatform(1750, 260, 60),
        Traps.movingSpikes(1820, 380, 1820, 220, 2.2),
        Traps.hiddenSpikes(1850, 260, 36, 48),
        Traps.surpriseTrap(1930, 168, 'up'),
        // The ultimate runaway exit — 6 dodges, fast speed.
        roamingExit(1920, 152, 6, 140, 80, 5.0, 2000, 1200),
        // Final pixel scares for maximum anxiety.
        Traps.pixelScare(1690, 440, 64, 'teeth'),
        Traps.pixelScare(1800, 360, 62, 'skull'),
        Traps.pixelScare(1900, 280, 60, 'eye'),
        Traps.pixelScare(1960, 180, 58, 'teeth')
      ]
    },

    // ── LEVEL 20: "The Final Escape" ────────────────────────────
    // THE FINAL LEVEL — a fast-paced boss chase corridor!
    // The player must continuously run forward, maintain momentum,
    // jump over traps and hazards, and reach the escape door at 3120px
    // while the giant demonic skull boss relentlessly chases them from behind.
    {
      name: 'The Final Escape',
      width: 4800, height: 600,
      spawn: { x: 80, y: 460 },
      exit: exit(4680, 422),
      platforms: [
        ...room(4800, 600, false),

        // ── Phase 1: The Awakening (0–800) ──
        plat(0, 500, 260),
        plat(330, 500, 180),
        plat(580, 480, 160),

        // ── Phase 2: The Crumbling (800–1600) ──
        plat(820, 470, 100),
        plat(990, 440, 90),
        plat(1160, 440, 90),
        plat(1330, 460, 110),
        plat(1500, 470, 90),

        // ── Phase 3: Infernal Surge (1600–2400) ──
        plat(1660, 470, 90),
        plat(1820, 370, 80),
        plat(1980, 380, 80),
        plat(2140, 440, 100),
        plat(2310, 460, 90),

        // ── Phase 4: Reality Collapse (2400–3200) ──
        plat(2470, 440, 90),
        plat(2630, 410, 80),
        plat(2770, 380, 80),
        plat(2910, 430, 80),
        plat(3070, 450, 100),

        // ── Phase 5: The Cataclysm (3200–4000) ──
        plat(3240, 460, 90),
        plat(3400, 420, 80),
        plat(3560, 390, 80),
        plat(3720, 430, 90),
        plat(3890, 450, 90),

        // ── Phase 6: The Final Escape (4000–4800) ──
        plat(4050, 450, 80),
        plat(4190, 420, 80),
        plat(4330, 400, 80),
        plat(4470, 430, 80),
        plat(4610, 470, 180)
      ],
      traps: [
        // ═══════════════════════════════════════════
        // Phase 1: Awakening (0–800)
        // ═══════════════════════════════════════════
        Traps.hiddenSpikes(370, 484, 48, 70),
        Traps.surpriseTrap(460, 476, 'up'),

        // ═══════════════════════════════════════════
        // Phase 2: The Crumbling (800–1600)
        // ═══════════════════════════════════════════
        Traps.fallingPlatform(820, 470, 100),
        Traps.movingPlatform(990, 440, 90, 990, 390, 1.8),
        Traps.falseGround(1160, 440, 90, 50, 'front'),
        Traps.timedSpikes(1360, 444, 40, 14, 22, 0),
        Traps.spikeWave(840, 560, 400, 860, 3.0, 1),
        Traps.pixelScare(1100, 350, 66, 'eye'),

        // ═══════════════════════════════════════════
        // Phase 3: Infernal Surge (1600–2400)
        // ═══════════════════════════════════════════
        Traps.launchPad(1680, 470, 60, -13, 14),
        Traps.disappearingPlatform(1820, 370, 80),
        Traps.movingSpikes(1900, 300, 1900, 440, 2.0),
        Traps.surpriseTrap(2160, 416, 'up'),
        Traps.timedSpikes(2150, 424, 36, 12, 20, 6),
        Traps.pixelScare(2020, 310, 64, 'skull'),

        // ═══════════════════════════════════════════
        // Phase 4: Reality Collapse (2400–3200)
        // ═══════════════════════════════════════════
        Traps.phantomPlatform(2470, 440, 90),
        Traps.timedSpikes(2640, 394, 36, 12, 18, 0),
        Traps.fallingCeiling(2770, 240, 48, 2750),
        Traps.invertZone(2880, 330, 100, 150),
        Traps.surpriseTrap(3090, 426, 'up'),
        Traps.pixelScare(2820, 300, 64, 'teeth'),

        // ═══════════════════════════════════════════
        // Phase 5: The Cataclysm (3200–4000)
        // ═══════════════════════════════════════════
        Traps.fallingPlatform(3240, 460, 90),
        Traps.movingPlatform(3400, 420, 80, 3400, 370, 2.0),
        Traps.launchPad(3570, 390, 60, -12, 14),
        Traps.movingSpikes(3650, 280, 3650, 440, 2.2),
        Traps.timedSpikes(3740, 414, 36, 10, 18, 2),
        Traps.surpriseTrap(3910, 426, 'up'),
        Traps.pixelScare(3680, 320, 66, 'eye'),

        // ═══════════════════════════════════════════
        // Phase 6: The Final Escape (4000–4800)
        // ═══════════════════════════════════════════
        Traps.fallingPlatform(4050, 450, 80),
        Traps.disappearingPlatform(4190, 420, 80),
        Traps.launchPad(4340, 400, 60, -13, 15),
        Traps.timedSpikes(4490, 414, 36, 10, 16, 0),
        Traps.surpriseTrap(4510, 406, 'up'),
        Traps.pixelScare(4550, 370, 68, 'skull')
      ]
    }
  ];

  function getLevel(index) {
    if (index < 0 || index >= levels.length) return null;
    return JSON.parse(JSON.stringify(levels[index]));
  }

  function getLevelOriginalTraps(index) {
    if (index < 0 || index >= levels.length) return [];
    return JSON.parse(JSON.stringify(levels[index].traps));
  }

  function getTotalLevels() {
    return levels.length;
  }

  return { getLevel, getLevelOriginalTraps, getTotalLevels };
})();
