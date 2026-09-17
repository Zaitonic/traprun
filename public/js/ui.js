// ============================================
// TRAP RUN — UI Manager
// ============================================
const UI = (() => {
  let currentScreen = 'menu';
  let previousScreen = 'menu';

  function showScreen(screenId) {
    if (currentScreen === 'victory' && screenId !== 'victory') {
      stopVictoryCelebration();
    }
    previousScreen = currentScreen;
    currentScreen = screenId;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${screenId}`);
    if (el) el.classList.add('active');

    // Show/hide HUD
    const hud = document.getElementById('hud');
    if (screenId === 'playing') {
      hud.classList.remove('hidden');
    } else {
      hud.classList.add('hidden');
    }

    // Show/hide touch controls
    const touch = document.getElementById('touch-controls');
    if (touch) {
      if (screenId === 'playing' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        touch.classList.remove('hidden');
      } else {
        touch.classList.add('hidden');
      }
    }
  }

  function hideAllScreens() {
    if (currentScreen === 'victory') {
      stopVictoryCelebration();
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const hud = document.getElementById('hud');
    hud.classList.remove('hidden');
  }

  function showHUD() {
    document.getElementById('hud').classList.remove('hidden');
  }

  function hideHUD() {
    document.getElementById('hud').classList.add('hidden');
  }

  function updateHUD(playerName, level, deaths, timeMs) {
    document.getElementById('hud-player').textContent = playerName;
    document.getElementById('hud-level').textContent = `Level ${level}`;
    const deathsVal = document.getElementById('hud-deaths-val');
    if (deathsVal) {
      deathsVal.textContent = deaths;
    } else {
      document.getElementById('hud-deaths').textContent = deaths;
    }
    const timerVal = document.getElementById('hud-timer-val');
    if (timerVal) {
      timerVal.textContent = formatTime(timeMs);
    } else {
      document.getElementById('hud-timer').textContent = formatTime(timeMs);
    }
  }

  function showDeath(playerName, level, deaths, timeMs) {
    document.getElementById('death-player').textContent = playerName;
    document.getElementById('death-level').textContent = level;
    document.getElementById('death-deaths').textContent = deaths;
    document.getElementById('death-time').textContent = formatTime(timeMs);
    showScreen('death');
  }

  function showLevelComplete(levelNum) {
    document.getElementById('level-complete-text').textContent = `Level ${levelNum} cleared!`;
    showScreen('level-complete');
  }

  function showQuitConfirm(level, deaths, timeMs) {
    document.getElementById('quit-level').textContent = level;
    document.getElementById('quit-deaths').textContent = deaths;
    document.getElementById('quit-time').textContent = formatTime(timeMs);
    showScreen('quit-confirm');
  }

  function showRunComplete(playerName, highestLevel, levelsCompleted, deaths, timeMs) {
    document.getElementById('run-player').textContent = playerName;
    document.getElementById('run-level').textContent = highestLevel;
    document.getElementById('run-completed').textContent = levelsCompleted;
    document.getElementById('run-deaths').textContent = deaths;
    document.getElementById('run-time').textContent = formatTime(timeMs);
    showScreen('run-complete');
  }

  let celebrationAnimId = null;
  let celebrationParticles = [];
  let celebrationSparks = [];

  function startVictoryCelebration(isLegitimate = true) {
    const canvas = document.getElementById('victory-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    celebrationParticles = [];
    celebrationSparks = [];

    const colors = isLegitimate
      ? ['#ffd700', '#ffae19', '#00e5ff', '#ff3d6e', '#00ff88', '#ffffff', '#e0aaff', '#ffeaa7']
      : ['#ff4444', '#ff8800', '#aaaaaa', '#ffffff', '#883333'];

    const particleCount = isLegitimate ? 140 : 50;
    for (let i = 0; i < particleCount; i++) {
      celebrationParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 1.2,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3.5 + 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        oscSpeed: Math.random() * 0.04 + 0.02,
        oscAmp: Math.random() * 2.2 + 1,
        shape: Math.random() > 0.35 ? 'rect' : 'circle'
      });
    }

    let burstTimer = 0;
    let angleRay = 0;

    function renderLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radiant sunburst behind victory card
      if (isLegitimate) {
        angleRay += 0.0025;
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.38;
        const maxDist = Math.max(canvas.width, canvas.height);
        const rayCount = 18;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angleRay);
        for (let i = 0; i < rayCount; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const a1 = (i * Math.PI * 2) / rayCount;
          const a2 = a1 + (Math.PI / rayCount) * 0.45;
          ctx.arc(0, 0, maxDist, a1, a2);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 215, 0, 0.028)' : 'rgba(255, 174, 25, 0.016)';
          ctx.fill();
        }
        ctx.restore();

        // Spawn periodic firework / sparkling bursts
        burstTimer++;
        if (burstTimer % 40 === 0) {
          const bx = canvas.width * (0.12 + Math.random() * 0.76);
          const by = canvas.height * (0.12 + Math.random() * 0.45);
          const burstColor = colors[Math.floor(Math.random() * colors.length)];
          for (let k = 0; k < 20; k++) {
            const angle = (k / 20) * Math.PI * 2 + (Math.random() * 0.2);
            const speed = Math.random() * 4.2 + 1.8;
            celebrationSparks.push({
              x: bx,
              y: by,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: burstColor,
              alpha: 1.0,
              size: Math.random() * 3 + 2,
              decay: Math.random() * 0.02 + 0.016
            });
          }
        }
      }

      // Render sparks
      for (let i = celebrationSparks.length - 1; i >= 0; i--) {
        const s = celebrationSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05;
        s.vx *= 0.98;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          celebrationSparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render confetti
      for (let i = 0; i < celebrationParticles.length; i++) {
        const p = celebrationParticles[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * p.oscSpeed) * p.oscAmp;
        p.rot += p.rotSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      celebrationAnimId = requestAnimationFrame(renderLoop);
    }

    if (celebrationAnimId) cancelAnimationFrame(celebrationAnimId);
    celebrationAnimId = requestAnimationFrame(renderLoop);
  }

  function stopVictoryCelebration() {
    if (celebrationAnimId) {
      cancelAnimationFrame(celebrationAnimId);
      celebrationAnimId = null;
    }
    const canvas = document.getElementById('victory-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function showVictoryScreen({
    playerName = 'Challenger',
    totalLevels = 20,
    levelsCompleted = 20,
    deaths = 0,
    timeMs = 0,
    isLegitimate = true,
    honoraryTitle = 'MASTER OF THE IMPOSSIBLE',
    subRank = 'Grand Champion of Trap Run',
    cheatReason = ''
  }) {
    document.getElementById('victory-player-name').textContent = playerName || 'Challenger';
    document.getElementById('victory-levels-summary').textContent = `${levelsCompleted} / ${totalLevels}`;
    document.getElementById('victory-deaths').textContent = deaths;
    document.getElementById('victory-time').textContent = formatTime(timeMs);

    const titleEl = document.getElementById('victory-honorary-title');
    const subRankEl = document.getElementById('victory-sub-rank');
    const cardEl = document.getElementById('victory-title-card');
    const crestIcon = document.getElementById('victory-crest-icon');
    const ribbonEl = document.getElementById('victory-conferred-banner');
    const sealEl = document.getElementById('victory-seal-tag');
    const cheatAlert = document.getElementById('victory-cheat-alert');
    const cheatDesc = document.getElementById('victory-cheat-desc');
    const pillText = document.getElementById('victory-pill-text');
    const headline = document.getElementById('victory-headline');
    const restartBtnText = document.getElementById('victory-restart-text');

    if (isLegitimate) {
      titleEl.textContent = honoraryTitle;
      subRankEl.textContent = subRank;
      cardEl.classList.remove('card-disqualified');
      cardEl.classList.add('card-conferred');
      crestIcon.textContent = '🏆';
      ribbonEl.textContent = '★ HONORARY TITLE BESTOWED ★';
      ribbonEl.className = 'victory-conferred-banner banner-gold';
      sealEl.textContent = 'OFFICIALLY CONFERRED & RECORDED IN HALL OF FAME';
      sealEl.className = 'victory-seal-tag seal-gold';
      cheatAlert.classList.add('hidden');
      pillText.textContent = 'CHALLENGE CONQUERED';
      headline.textContent = 'THE GRAND ESCAPE';
      if (restartBtnText) restartBtnText.textContent = 'PLAY AGAIN';
    } else {
      titleEl.textContent = honoraryTitle;
      subRankEl.textContent = subRank;
      cardEl.classList.remove('card-conferred');
      cardEl.classList.add('card-disqualified');
      crestIcon.textContent = '🔒';
      ribbonEl.textContent = '⚠️ HONORARY TITLE WITHHELD ⚠️';
      ribbonEl.className = 'victory-conferred-banner banner-warning';
      sealEl.textContent = 'STATUS: ASSISTED RUN — UNRANKED';
      sealEl.className = 'victory-seal-tag seal-warning';
      cheatAlert.classList.remove('hidden');
      if (cheatDesc && cheatReason) {
        cheatDesc.textContent = cheatReason;
      }
      pillText.textContent = 'ASSISTED COMPLETION';
      headline.textContent = 'LEVEL 20 REACHED';
      if (restartBtnText) restartBtnText.textContent = 'ATTEMPT PURE RUN';
    }

    showScreen('victory');
    startVictoryCelebration(isLegitimate);
  }

  function showWelcome(name) {
    document.getElementById('welcome-name').textContent = name;
    showScreen('welcome');
  }

  function showLoading(levelNumber, levelName) {
    const hints = [
      'Do not trust the floor.',
      'If it looks safe, wait one second.',
      'The exit has its own plans.',
      'Some platforms only help once.',
      'The ceiling is part of the level too.',
      'Running is useful. Until it is not.',
      'A fake route is still a route to death.',
      'The room remembers your first attempt.'
    ];
    document.getElementById('loading-stage').textContent = `STAGE ${levelNumber}: ${levelName}`;
    document.getElementById('loading-hint').textContent = hints[(levelNumber - 1) % hints.length];
    showScreen('loading');
  }

  async function showLeaderboard(returnScreen = 'menu') {
    const entries = await API.getLeaderboard();
    const tbody = document.getElementById('leaderboard-body');
    const emptyMsg = document.getElementById('leaderboard-empty');

    tbody.innerHTML = '';

    if (entries.length === 0) {
      emptyMsg.classList.remove('hidden');
    } else {
      emptyMsg.classList.add('hidden');
      entries.forEach((entry, i) => {
        const rank = i + 1;
        const tr = document.createElement('tr');
        if (rank <= 3) tr.className = `rank-${rank}`;
        
        const rankDisplay = rank <= 3 
          ? `<span class="rank-medal rank-medal-${rank}"><span class="medal-shine"></span>${rank}</span>` 
          : `<span class="rank-num">${rank}</span>`;
        
        tr.innerHTML = `
          <td>${rankDisplay}</td>
          <td>${escapeHtml(entry.name)}</td>
          <td>${entry.best_highest_level}</td>
          <td>${entry.best_levels_completed}</td>
          <td>${entry.fewest_deaths}</td>
          <td>${formatTime(entry.best_time_ms)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Store return screen for back button
    document.getElementById('btn-leaderboard-back').dataset.returnScreen = returnScreen;
    showScreen('leaderboard');
  }

  async function showMyRecord(playerName) {
    const needName = document.getElementById('my-record-need-name');
    const dataEl = document.getElementById('my-record-data');
    const notFound = document.getElementById('my-record-not-found');

    if (!playerName) {
      needName.classList.remove('hidden');
      dataEl.classList.add('hidden');
      notFound.classList.add('hidden');
      showScreen('my-record');
      return;
    }

    needName.classList.add('hidden');

    const record = await API.getPlayerRecord(playerName);

    if (!record || !record.record) {
      dataEl.classList.add('hidden');
      notFound.classList.remove('hidden');
      showScreen('my-record');
      return;
    }

    notFound.classList.add('hidden');
    dataEl.classList.remove('hidden');

    document.getElementById('record-level').textContent = record.record.best_highest_level;
    document.getElementById('record-completed').textContent = record.record.best_levels_completed;
    document.getElementById('record-deaths').textContent = record.record.fewest_deaths;
    document.getElementById('record-time').textContent = formatTime(record.record.best_time_ms);
    document.getElementById('record-runs').textContent = record.record.total_runs;

    // Run history
    const historyList = document.getElementById('record-history-list');
    historyList.innerHTML = '';

    if (record.runs && record.runs.length > 0) {
      record.runs.forEach(run => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <span>Level ${run.highest_level} (${run.deaths} deaths)</span>
          <span>${formatTime(run.play_time_ms)} — ${new Date(run.created_at).toLocaleDateString()}</span>
        `;
        historyList.appendChild(item);
      });
    } else {
      historyList.innerHTML = '<div class="empty-text">No runs yet.</div>';
    }

    showScreen('my-record');
  }

  function setNameError(msg) {
    document.getElementById('name-error').textContent = msg;
  }

  function getNameInput() {
    return document.getElementById('input-name').value.trim();
  }

  function setNameInput(val) {
    document.getElementById('input-name').value = val;
  }

  function focusNameInput() {
    setTimeout(() => document.getElementById('input-name').focus(), 100);
  }

  // Utility
  function formatTime(ms) {
    if (!ms || ms <= 0 || ms >= 999999999) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  return {
    showScreen,
    hideAllScreens,
    showHUD,
    hideHUD,
    updateHUD,
    showDeath,
    showLevelComplete,
    showQuitConfirm,
    showRunComplete,
    showVictoryScreen,
    startVictoryCelebration,
    stopVictoryCelebration,
    showWelcome,
    showLoading,
    showLeaderboard,
    showMyRecord,
    setNameError,
    getNameInput,
    setNameInput,
    focusNameInput,
    formatTime,
    get currentScreen() { return currentScreen; },
    get previousScreen() { return previousScreen; }
  };
})();
