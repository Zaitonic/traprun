// ============================================
// TRAP RUN — Main Game Loop & State Machine
// ============================================
const Game = (() => {
  // Game state
  let state = 'MENU'; // MENU, NAME_ENTRY, WELCOME, LOADING, PLAYING, DEATH, LEVEL_COMPLETE, QUIT_CONFIRM, RUN_COMPLETE, LEADERBOARD, MY_RECORD, SETTINGS
  let playerName = '';
  let playerId = null;
  let currentLevelIndex = 0;
  let deaths = 0;
  let levelsCompleted = 0;
  let highestLevel = 1;
  let runStartTime = 0;
  let runElapsedTime = 0;
  let levelStartTime = 0;
  let bestLevelTimeMs = 999999999;
  let isPaused = false;
  let cheatsUsed = false;
  let skippedLevels = 0;
  const legitCompletedLevels = new Set();

  // Level data
  let currentLevel = null;
  let originalTraps = null;
  let levelNameAlpha = 0;
  let levelNameTimer = 0;

  // Transition
  let transitionTimer = 0;
  let transitionCallback = null;

  function init() {
    Renderer.init();
    Input.init();
    AudioManager.init();

    // Load saved settings
    loadSettings();

    // Load last player name
    const lastPlayer = localStorage.getItem('traprun_lastPlayer');
    if (lastPlayer) {
      UI.setNameInput(lastPlayer);
    }

    // Bind all UI buttons
    bindButtons();

    // Start game loop
    requestAnimationFrame(gameLoop);

    // Show menu
    setState('MENU');
  }

  function bindButtons() {
    // Main menu
    document.getElementById('btn-play').addEventListener('click', () => {
      AudioManager.menuClick();
      setState('NAME_ENTRY');
      UI.focusNameInput();
    });

    document.getElementById('btn-leaderboard').addEventListener('click', () => {
      AudioManager.menuClick();
      setState('LEADERBOARD');
      UI.showLeaderboard('menu');
    });

    document.getElementById('btn-my-record').addEventListener('click', () => {
      AudioManager.menuClick();
      const lastPlayer = localStorage.getItem('traprun_lastPlayer') || '';
      setState('MY_RECORD');
      UI.showMyRecord(lastPlayer);
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      AudioManager.menuClick();
      setState('SETTINGS');
    });

    // Name entry
    document.getElementById('btn-start-game').addEventListener('click', startGame);
    document.getElementById('input-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startGame();
    });
    document.getElementById('btn-name-back').addEventListener('click', () => {
      AudioManager.menuBack();
      setState('MENU');
    });

    // In-game HUD Menu button
    const btnHudMenu = document.getElementById('btn-hud-menu');
    if (btnHudMenu) {
      btnHudMenu.addEventListener('click', () => {
        pauseGame();
      });
    }

    // Pause screen buttons
    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) {
      btnPauseResume.addEventListener('click', () => {
        resumeGame();
      });
    }
    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) {
      btnPauseRestart.addEventListener('click', () => {
        AudioManager.menuClick();
        isPaused = false;
        runStartTime = Date.now();
        playAgain();
      });
    }
    const btnPauseMenu = document.getElementById('btn-pause-menu');
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => {
        returnToStartScreen(true);
      });
    }
    const btnPauseLeaderboard = document.getElementById('btn-pause-leaderboard');
    if (btnPauseLeaderboard) {
      btnPauseLeaderboard.addEventListener('click', () => {
        AudioManager.menuClick();
        setState('LEADERBOARD');
        UI.showLeaderboard('pause');
      });
    }

    // Death screen buttons
    document.getElementById('btn-play-again').addEventListener('click', () => {
      AudioManager.menuClick();
      playAgain();
    });
    const btnDeathMenu = document.getElementById('btn-death-menu');
    if (btnDeathMenu) {
      btnDeathMenu.addEventListener('click', () => {
        returnToStartScreen(true);
      });
    }
    const btnDeathQuickExit = document.getElementById('btn-death-quick-exit');
    if (btnDeathQuickExit) {
      btnDeathQuickExit.addEventListener('click', () => {
        returnToStartScreen(true);
      });
    }
    const btnQuitRun = document.getElementById('btn-quit-run');
    if (btnQuitRun) {
      btnQuitRun.addEventListener('click', () => {
        returnToStartScreen(true);
      });
    }
    document.getElementById('btn-death-leaderboard').addEventListener('click', () => {
      AudioManager.menuClick();
      setState('LEADERBOARD');
      UI.showLeaderboard('death');
    });

    // Quit confirmation buttons
    document.getElementById('btn-confirm-quit').addEventListener('click', () => {
      returnToStartScreen(true);
    });
    document.getElementById('btn-cancel-quit').addEventListener('click', () => {
      resumeGame();
    });

    // Run complete buttons
    const btnRunMenu = document.getElementById('btn-run-menu');
    if (btnRunMenu) {
      btnRunMenu.addEventListener('click', () => {
        returnToStartScreen(false);
      });
    }
    document.getElementById('btn-run-leaderboard').addEventListener('click', () => {
      AudioManager.menuClick();
      setState('LEADERBOARD');
      UI.showLeaderboard('run-complete');
    });
    document.getElementById('btn-new-player').addEventListener('click', () => {
      AudioManager.menuClick();
      resetRun();
      setState('NAME_ENTRY');
      UI.setNameInput('');
      UI.focusNameInput();
    });
    document.getElementById('btn-run-play-again').addEventListener('click', () => {
      AudioManager.menuClick();
      resetRun();
      currentLevelIndex = 0;
      beginLevel(0);
    });

    // Victory screen buttons
    const btnVictoryRestart = document.getElementById('btn-victory-restart');
    if (btnVictoryRestart) {
      btnVictoryRestart.addEventListener('click', () => {
        AudioManager.menuClick();
        UI.stopVictoryCelebration();
        resetRun();
        currentLevelIndex = 0;
        beginLevel(0);
      });
    }
    const btnVictoryMenu = document.getElementById('btn-victory-menu');
    if (btnVictoryMenu) {
      btnVictoryMenu.addEventListener('click', () => {
        UI.stopVictoryCelebration();
        returnToStartScreen(false);
      });
    }
    const btnVictoryLeaderboard = document.getElementById('btn-victory-leaderboard');
    if (btnVictoryLeaderboard) {
      btnVictoryLeaderboard.addEventListener('click', () => {
        AudioManager.menuClick();
        UI.stopVictoryCelebration();
        setState('LEADERBOARD');
        UI.showLeaderboard('victory');
      });
    }

    // Leaderboard back
    document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
      AudioManager.menuBack();
      const returnTo = document.getElementById('btn-leaderboard-back').dataset.returnScreen || 'menu';
      if (returnTo === 'death') {
        setState('DEATH');
        UI.showDeath(playerName, highestLevel, deaths, getRunTime());
      } else if (returnTo === 'run-complete') {
        setState('RUN_COMPLETE');
        UI.showRunComplete(playerName, highestLevel, levelsCompleted, deaths, getRunTime());
      } else if (returnTo === 'victory') {
        setState('VICTORY');
        UI.showScreen('victory');
        UI.startVictoryCelebration(!cheatsUsed && skippedLevels === 0);
      } else if (returnTo === 'pause') {
        setState('PAUSE');
      } else {
        setState('MENU');
      }
    });

    // My Record back
    document.getElementById('btn-record-back').addEventListener('click', () => {
      AudioManager.menuBack();
      setState('MENU');
    });

    // Settings back
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      AudioManager.menuBack();
      saveSettings();
      setState('MENU');
    });

    // Global keyboard listener for instant navigation back to start
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      // Shift+K skips the current level (skipping is not considered cheating)
      if (e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        if (state === 'PLAYING' || state === 'DEATH' || state === 'PAUSE' || state === 'LOADING') {
          e.preventDefault();
          isPaused = false;
          legitCompletedLevels.add(currentLevelIndex + 1);
          levelsCompleted++;
          highestLevel = Math.max(highestLevel, currentLevelIndex + 2);
          runElapsedTime += Date.now() - runStartTime;
          runStartTime = Date.now();
          if (currentLevelIndex + 1 >= Levels.getTotalLevels()) {
            triggerVictorySequence();
          } else {
            beginLevel(currentLevelIndex + 1);
          }
          return;
        }
      }

      if (e.key === 'Escape' || e.key === 'Esc') {
        if (state === 'PLAYING') {
          pauseGame();
        } else if (state === 'DEATH') {
          returnToStartScreen(true);
        } else if (state === 'PAUSE' || state === 'QUIT_CONFIRM') {
          resumeGame();
        } else if (state === 'VICTORY') {
          UI.stopVictoryCelebration();
          returnToStartScreen(false);
        } else if (state === 'NAME_ENTRY' || state === 'LEADERBOARD' || state === 'MY_RECORD' || state === 'SETTINGS') {
          returnToStartScreen(false);
        }
      } else if (state === 'DEATH') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          playAgain();
        } else if (e.key === 'm' || e.key === 'M' || e.key === 'Backspace') {
          returnToStartScreen(true);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (state === 'PLAYING') {
          pauseGame();
        } else if (state === 'PAUSE') {
          resumeGame();
        }
      }
    });

    document.getElementById('setting-music').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('setting-music-val').textContent = val + '%';
      AudioManager.setMusicVolume(val / 100);
      // Persist each adjustment immediately. This keeps a player's choice even
      // if they refresh or close the game without using the Back button.
      localStorage.setItem('traprun_musicVol', val);
    });

    document.getElementById('setting-sfx').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('setting-sfx-val').textContent = val + '%';
      AudioManager.setSfxVolume(val / 100);
    });

    document.getElementById('setting-shake').addEventListener('change', (e) => {
      Camera.setShakeEnabled(e.target.checked);
    });
  }

  async function startGame() {
    const name = UI.getNameInput();

    // Validate
    if (!name || name.length < 1) {
      UI.setNameError('Please enter your name.');
      return;
    }
    if (name.length > 20) {
      UI.setNameError('Name must be 20 characters or less.');
      return;
    }
    if (/[<>&"'\/\\]/.test(name)) {
      UI.setNameError('Name contains invalid characters.');
      return;
    }

    UI.setNameError('');

    // Register with server
    const player = await API.registerPlayer(name);
    if (!player) {
      UI.setNameError('Server error. Try again.');
      return;
    }

    playerName = player.name;
    playerId = player.id;
    localStorage.setItem('traprun_lastPlayer', playerName);

    AudioManager.menuClick();

    // Show welcome
    UI.showWelcome(playerName);
    setState('WELCOME');

    // Auto start after 2 seconds — always begins at Level 1
    setTimeout(() => {
      if (state === 'WELCOME') {
        resetRun();
        beginLevel(0);
      }
    }, 2000);
  }

  function resetRun() {
    deaths = 0;
    levelsCompleted = 0;
    highestLevel = 1;
    currentLevelIndex = 0;
    runStartTime = Date.now();
    runElapsedTime = 0;
    bestLevelTimeMs = 999999999;
    cheatsUsed = false;
    skippedLevels = 0;
    legitCompletedLevels.clear();
  }

  function beginLevel(index) {
    const nextLevel = Levels.getLevel(index);
    if (!nextLevel) {
      endRun(true);
      return;
    }

    // A short skull warning gives every room a distinct, dangerous entrance.
    Renderer.setStage(index);
    setState('LOADING');
    UI.showLoading(index + 1, nextLevel.name);

    setTimeout(() => {
      if (state === 'LOADING') startLevel(index);
    }, 1150);
  }

  function startLevel(index) {
    currentLevelIndex = index;
    currentLevel = Levels.getLevel(index);
    originalTraps = Levels.getLevelOriginalTraps(index);

    if (!currentLevel) {
      // All levels complete!
      endRun(true);
      return;
    }

    // Recreate trap objects from level data
    currentLevel.traps = recreateTraps(currentLevel.traps);
    originalTraps = recreateTraps(originalTraps);

    Renderer.setStage(index);
    Camera.setLevel(currentLevel.width, currentLevel.height);
    Player.reset(currentLevel.spawn.x, currentLevel.spawn.y);
    Camera.snapTo(currentLevel.spawn.x + Player.w / 2, currentLevel.spawn.y + Player.h / 2);
    Particles.clear();
    Input.reset();

    // Select the soundtrack profile for this room. The AudioManager preserves
    // the user's existing volume setting and crossfades its procedural layers.
    AudioManager.startMusic(index + 1);
    AudioManager.setSectionIntensity(0);

    // A brief burst makes the persistent spawn fire feel alive on arrival.
    Particles.spawn(currentLevel.spawn.x + Player.w / 2, currentLevel.spawn.y + Player.h, 18, {
      colors: ['#ff334d', '#ff8b37', '#ffe08a'],
      minSpeed: 0.5,
      maxSpeed: 2.8,
      minSize: 2,
      maxSize: 5,
      life: 34,
      gravity: -0.05,
      spread: Math.PI * 0.7,
      angle: -Math.PI / 2,
      shape: 'circle'
    });

    highestLevel = Math.max(highestLevel, index + 1);
    levelStartTime = Date.now();
    isPaused = false;

    // Final Boss activation for Level 20 (the true final level)
    if (index === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.start(currentLevel.spawn.x, currentLevel.spawn.y);
    } else if (typeof FinalBoss !== 'undefined') {
      FinalBoss.stop();
    }

    // Show level name briefly
    levelNameAlpha = 1;
    levelNameTimer = 120;

    setState('PLAYING');
    UI.hideAllScreens();
    UI.showHUD();
    UI.updateHUD(playerName, currentLevelIndex + 1, deaths, getRunTime());
  }

  function recreateTraps(trapData) {
    // When levels are loaded from JSON, we need to recreate trap objects
    // because the factory functions add default properties
    return trapData.map(t => {
      const factory = Traps[t.type];
      if (!factory) return t;

      // Copy all properties
      const trap = { ...t };
      return trap;
    });
  }

  function playAgain() {
    // Restart current level — preserve all run data
    startLevel(currentLevelIndex);
  }

  function pauseGame() {
    if (state !== 'PLAYING') return;
    isPaused = true;
    runElapsedTime += Date.now() - runStartTime;
    AudioManager.menuClick();
    setState('PAUSE');
  }

  function resumeGame() {
    if (state !== 'PAUSE' && state !== 'QUIT_CONFIRM') return;
    isPaused = false;
    runStartTime = Date.now();
    AudioManager.menuClick();
    setState('PLAYING');
    UI.hideAllScreens();
    UI.showHUD();
  }

  async function returnToStartScreen(saveProgress = true) {
    if (typeof FinalBoss !== 'undefined') {
      FinalBoss.stop();
    }
    AudioManager.stopMusic();
    AudioManager.menuClick();
    isPaused = false;

    if (saveProgress && playerId && (highestLevel > 1 || deaths > 0 || currentLevelIndex > 0)) {
      try {
        await API.saveRun(playerId, {
          highestLevel,
          levelsCompleted,
          deaths,
          playTimeMs: getRunTime(),
          bestLevelTimeMs: bestLevelTimeMs < 999999999 ? bestLevelTimeMs : 0,
          completed: false
        });
      } catch (err) {
        console.warn('Could not save run on exit to menu:', err);
      }
    }

    resetRun();
    setState('MENU');
  }

  async function endRun(allComplete = false) {
    AudioManager.stopMusic();

    // Save run to server
    await API.saveRun(playerId, {
      highestLevel,
      levelsCompleted,
      deaths,
      playTimeMs: getRunTime(),
      bestLevelTimeMs: bestLevelTimeMs < 999999999 ? bestLevelTimeMs : 0,
      completed: allComplete
    });

    setState('RUN_COMPLETE');
    UI.showRunComplete(playerName, highestLevel, levelsCompleted, deaths, getRunTime());
  }

  function getRunTime() {
    if (state === 'PLAYING') {
      return runElapsedTime + (Date.now() - runStartTime);
    }
    return runElapsedTime;
  }

  function setState(newState) {
    state = newState;

    // The original menu theme belongs only to the home screen; gameplay music
    // and sound effects remain untouched when other states are entered.
    if (newState !== 'MENU') {
      AudioManager.stopMenuMusic();
    }

    switch (newState) {
      case 'MENU':
        UI.showScreen('menu');
        AudioManager.startMenuMusic();
        break;
      case 'NAME_ENTRY':
        UI.showScreen('name');
        break;
      case 'WELCOME':
        // Handled in startGame
        break;
      case 'LOADING':
        // Handled by beginLevel so the stage name can be injected first.
        break;
      case 'PLAYING':
        // Handled in startLevel
        break;
      case 'PAUSE':
        const pausePlayer = document.getElementById('pause-player');
        if (pausePlayer) pausePlayer.textContent = playerName;
        const pauseLevel = document.getElementById('pause-level');
        if (pauseLevel) pauseLevel.textContent = currentLevelIndex + 1;
        const pauseDeaths = document.getElementById('pause-deaths');
        if (pauseDeaths) pauseDeaths.textContent = deaths;
        const pauseTime = document.getElementById('pause-time');
        if (pauseTime) pauseTime.textContent = UI.formatTime(getRunTime());
        UI.showScreen('pause');
        break;
      case 'DEATH':
        // Handled by caller
        break;
      case 'LEVEL_COMPLETE':
        // Handled by caller
        break;
      case 'QUIT_CONFIRM':
        // Handled by caller
        break;
      case 'RUN_COMPLETE':
        // Handled by caller
        break;
      case 'LEADERBOARD':
        // Handled by caller
        break;
      case 'MY_RECORD':
        // Handled by caller
        break;
      case 'VICTORY':
        // Handled by triggerVictorySequence
        break;
      case 'SETTINGS':
        UI.showScreen('settings');
        break;
    }
  }

  // ---- GAME LOOP ----
  let lastTime = 0;

  function gameLoop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 33); // Cap at ~30fps minimum
    lastTime = timestamp;

    if ((state === 'PLAYING' || state === 'BOSS_ESCAPE') && !isPaused) {
      update(dt);
      render();
    } else if (state === 'MENU' || state === 'NAME_ENTRY' || state === 'SETTINGS' || state === 'WELCOME' || state === 'LOADING') {
      // Render background animation on menus
      Renderer.clear();
      Renderer.renderBackground(Date.now() * 0.01, 0);
    }

    Input.clearFrame();
    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    // Cinematic boss escape state
    if (state === 'BOSS_ESCAPE') {
      if (typeof FinalBoss !== 'undefined') {
        FinalBoss.update(dt, Player);
      }
      Camera.follow(currentLevel.exit.x - 120, currentLevel.exit.y - 40, 0.05);
      Camera.update(dt);
      Particles.update();
      return;
    }

    // Keyboard shortcuts during gameplay
    if (Input.isKeyPressed('escape') || Input.isKeyPressed('p')) {
      pauseGame();
      return;
    }

    if (Input.isKeyPressed('r')) {
      playAgain();
      return;
    }

    // Update player
    Player.update(dt);

    // Update camera
    Camera.follow(Player.x + Player.w / 2, Player.y + Player.h / 2, 0.08);
    Camera.update(dt);

    // Get all solid surfaces (platforms + solid traps)
    const platforms = [...currentLevel.platforms];
    const solidTraps = Traps.getSolidTraps(currentLevel.traps);
    const allSolids = [...platforms, ...solidTraps];

    // Resolve collisions
    const collision = Physics.resolvePlayerPlatforms(Player, allSolids);
    Player.setGrounded(collision.grounded);

    // Check if player is on a moving platform
    if (collision.grounded && Player.groundedPlatform && Player.groundedPlatform.trap) {
      const trap = Player.groundedPlatform.trap;
      if (trap.type === 'movingPlatform' && trap.dx !== undefined) {
        Player.x += trap.dx;
        Player.y += trap.dy;
      }
    }

    // Update traps
    for (const trap of currentLevel.traps) {
      Traps.updateTrap(trap, Player, dt);
    }

    // Check trap collisions
    let inGravityFlip = false;
    let inInvertControls = false;
    for (const trap of currentLevel.traps) {
      const result = Traps.checkPlayerCollision(trap, Player);
      if (result === 'kill') {
        playerDeath();
        return;
      }
      if (result === 'gravityFlip') {
        inGravityFlip = true;
      }
      if (result === 'invertControls') {
        inInvertControls = true;
      }
      if (result === 'runawayExitCaught') {
        levelComplete();
        return;
      }
      if (result && result.action === 'teleport') {
        Player.x = result.destX;
        Player.y = result.destY;
        Player.vx = 0;
        Player.vy = 0;
        Camera.snapTo(Player.x, Player.y);
        Particles.trapSpark(result.destX, result.destY);
        AudioManager.trapTrigger();
        Player.shock(1.25);
        Camera.shake(5, 140);
      }
      if (result && result.action === 'launch') {
        Player.vy = result.force;
        Player.setGrounded(false);
        Particles.deathBurst(Player.x + Player.w / 2, Player.y + Player.h);
      }
    }
    Player.gravityFlipped = inGravityFlip;
    Player.invertedControls = inInvertControls;

    // Check exit collision
    if (Physics.aabb(
      { x: Player.x, y: Player.y, w: Player.w, h: Player.h },
      currentLevel.exit
    )) {
      if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
        startBossEscapeCinematic();
      } else {
        levelComplete();
      }
      return;
    }

    // Check out of bounds (fell off level)
    if (Player.y > currentLevel.height + 100 || Player.y < -200 ||
        Player.x < -100 || Player.x > currentLevel.width + 100) {
      playerDeath();
      return;
    }

    // Final Boss Chase Logic for Level 20
    if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.update(dt, Player);
      if (FinalBoss.catchesPlayer(Player)) {
        playerDeath();
        return;
      }
    } else if (currentLevelIndex >= 15 && currentLevelIndex <= 18) {
      // Levels 16–19 gain small musical surges as players push into later
      // gauntlet sections. This is audio-only and does not alter their layout.
      const horizontalProgress = Math.max(0, Math.min(1, Player.x / currentLevel.width));
      const verticalProgress = Math.max(0, Math.min(1, (currentLevel.height - Player.y) / currentLevel.height));
      const progress = Math.max(horizontalProgress, verticalProgress);
      const sectionSurge = 0.18 + progress * 0.62 + (Math.floor(progress * 4) % 2 ? 0.08 : 0);
      AudioManager.setSectionIntensity(sectionSurge);
    }

    // Update particles
    Particles.update();

    // Update HUD
    UI.updateHUD(playerName, currentLevelIndex + 1, deaths, getRunTime());

    // Level name fade
    if (levelNameTimer > 0) {
      levelNameTimer--;
      if (levelNameTimer < 30) {
        levelNameAlpha = levelNameTimer / 30;
      }
    }
  }

  function render() {
    const ctx = Renderer.ctx;

    Renderer.clear();
    Renderer.renderBackground(Camera.x, Camera.y);

    Camera.apply(ctx);

    // Render level
    Renderer.renderPlatforms(currentLevel.platforms);
    Renderer.renderExit(currentLevel.exit);
    Renderer.renderSpawnFire(currentLevel.spawn.x + Player.w / 2, currentLevel.spawn.y + Player.h);
    Renderer.renderTraps(currentLevel.traps);

    // Render player
    Player.render(ctx);

    // Render Final Boss (Level 20 only) in world space
    if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.renderWorld(ctx);
    }

    // Render particles
    Particles.render(ctx);

    // Reset transform for UI
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Render flash effect
    Renderer.renderFlash();

    // Harmless high-contrast pixel scares triggered by late-game lure traps.
    Renderer.renderPixelScare();

    // Render Final Boss Danger Overlay & Proximity Meter (Level 20 only) in screen space
    if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.renderOverlay(ctx, Renderer.width, Renderer.height);
    }

    // Render level name
    if (state === 'PLAYING' && levelNameAlpha > 0 && currentLevel) {
      Renderer.renderLevelName(
        `Level ${currentLevelIndex + 1}: ${currentLevel.name}`,
        levelNameAlpha
      );
    }
  }

  function startBossEscapeCinematic() {
    if (state === 'BOSS_ESCAPE') return;
    setState('BOSS_ESCAPE');
    // Keep the final-boss track alive and push it to its climax as the player
    // crosses into the escape sequence; victory fanfare takes over afterward.
    AudioManager.startBossEscapeClimax();
    UI.hideHUD();
    legitCompletedLevels.add(currentLevelIndex + 1);
    levelsCompleted++;
    highestLevel = Math.max(highestLevel, currentLevelIndex + 2);
    const levelTime = Date.now() - levelStartTime;
    if (levelTime < bestLevelTimeMs) {
      bestLevelTimeMs = levelTime;
    }

    FinalBoss.startEscape(Player, currentLevel.exit, () => {
      triggerVictorySequence();
    });
  }

  function playerDeath() {
    if (Player.dead) return;

    if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.onPlayerDeath();
    }

    deaths++;
    Player.die();
    Renderer.flash('#ff0000', 0.4);
    isPaused = true;
    runElapsedTime += Date.now() - runStartTime;

    // Fast death screen transition for instant restart loop (<0.15s)
    setTimeout(() => {
      setState('DEATH');
      UI.showDeath(playerName, currentLevelIndex + 1, deaths, getRunTime());
    }, 150);
  }

  function levelComplete() {
    if (state !== 'PLAYING') return;

    if (currentLevelIndex === 19 && typeof FinalBoss !== 'undefined') {
      FinalBoss.onLevelComplete();
    }

    legitCompletedLevels.add(currentLevelIndex + 1);
    levelsCompleted++;
    highestLevel = Math.max(highestLevel, currentLevelIndex + 2);
    const levelTime = Date.now() - levelStartTime;
    if (levelTime < bestLevelTimeMs) {
      bestLevelTimeMs = levelTime;
    }

    AudioManager.levelComplete();
    Particles.levelComplete(Player.x + Player.w / 2, Player.y + Player.h / 2);
    Renderer.flash('#00ff88', 0.3);

    runElapsedTime += Date.now() - runStartTime;

    UI.showLevelComplete(currentLevelIndex + 1);
    setState('LEVEL_COMPLETE');

    // Auto advance after 1.5 seconds
    setTimeout(() => {
      if (state === 'LEVEL_COMPLETE') {
        if (currentLevelIndex + 1 >= Levels.getTotalLevels()) {
          // Game complete! Trigger special victory sequence
          triggerVictorySequence();
        } else {
          runStartTime = Date.now();
          beginLevel(currentLevelIndex + 1);
        }
      }
    }, 1500);
  }

  async function triggerVictorySequence() {
    AudioManager.stopMusic();
    runElapsedTime += (Date.now() - runStartTime);

    const totalLevels = Levels.getTotalLevels();
    const isLegitimate = true;

    let honoraryTitle = 'MASTER OF THE IMPOSSIBLE';
    let subRank = 'Grand Champion of Trap Run • 20/20 Rooms Conquered';

    if (deaths === 0) {
      honoraryTitle = 'IMMORTAL OF THE IMPOSSIBLE';
      subRank = 'Flawless Sovereign • 0 Deaths • Pure Ascendance';
    } else if (deaths <= 15) {
      honoraryTitle = 'MASTER OF THE IMPOSSIBLE';
      subRank = 'Grand Champion • Elite Precision • Sub-15 Casualties';
    } else if (deaths <= 45) {
      honoraryTitle = 'THE ULTIMATE CHALLENGER';
      subRank = 'Relentless Conqueror • 20/20 Rooms Cleared';
    } else if (deaths <= 90) {
      honoraryTitle = 'CONQUEROR OF THE ABYSS';
      subRank = 'Unyielding Vanguard • Tested By Fire';
    } else {
      honoraryTitle = 'THE UNBREAKABLE TITAN';
      subRank = 'Indomitable Legend • Never Surrendered';
    }

    localStorage.setItem('traprun_honorary_title', honoraryTitle);
    localStorage.setItem('traprun_honorary_subrank', subRank);
    AudioManager.victoryFanfare();

    // Save run to server
    try {
      await API.saveRun(playerId, {
        highestLevel,
        levelsCompleted: totalLevels,
        deaths,
        playTimeMs: getRunTime(),
        bestLevelTimeMs: bestLevelTimeMs < 999999999 ? bestLevelTimeMs : 0,
        completed: true
      });
    } catch (err) {
      console.warn('Could not save victory run:', err);
    }

    setState('VICTORY');
    UI.showVictoryScreen({
      playerName,
      totalLevels,
      levelsCompleted: totalLevels,
      deaths,
      timeMs: getRunTime(),
      isLegitimate: true,
      honoraryTitle,
      subRank
    });
  }

  function loadSettings() {
    const musicVol = localStorage.getItem('traprun_musicVol');
    const sfxVol = localStorage.getItem('traprun_sfxVol');
    const shake = localStorage.getItem('traprun_shake');

    if (musicVol !== null) {
      AudioManager.setMusicVolume(parseInt(musicVol) / 100);
      document.getElementById('setting-music').value = musicVol;
      document.getElementById('setting-music-val').textContent = musicVol + '%';
    }
    if (sfxVol !== null) {
      AudioManager.setSfxVolume(parseInt(sfxVol) / 100);
      document.getElementById('setting-sfx').value = sfxVol;
      document.getElementById('setting-sfx-val').textContent = sfxVol + '%';
    }
    if (shake !== null) {
      const shakeEnabled = shake === 'true';
      Camera.setShakeEnabled(shakeEnabled);
      document.getElementById('setting-shake').checked = shakeEnabled;
    }
  }

  function saveSettings() {
    localStorage.setItem('traprun_musicVol', document.getElementById('setting-music').value);
    localStorage.setItem('traprun_sfxVol', document.getElementById('setting-sfx').value);
    localStorage.setItem('traprun_shake', document.getElementById('setting-shake').checked);
  }

  // Expose jumpToLevel globally for testing & level jumping
  window.jumpToLevel = (lvl) => {
    resetRun();
    beginLevel(lvl - 1);
  };

  return { init, jumpToLevel: window.jumpToLevel };
})();

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', Game.init);
