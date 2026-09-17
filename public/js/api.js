// ============================================
// TRAP RUN — Offline API (localStorage)
// Fully replaces server calls so the game works
// from any file:// or local server without a backend.
// ============================================
const API = (() => {

  const STORE_KEY  = 'traprun_db';
  const RUNS_KEY   = 'traprun_runs';

  // ── Internal storage helpers ──────────────────────────────
  function loadPlayers() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  }
  function savePlayers(db) {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  }
  function loadRuns() {
    try { return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]'); }
    catch { return []; }
  }
  function saveRuns(runs) {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── registerPlayer ───────────────────────────────────────
  async function registerPlayer(name) {
    try {
      const db = loadPlayers();
      const key = name.toLowerCase().trim();
      if (!db[key]) {
        db[key] = { id: uid(), name: name.trim(), created_at: new Date().toISOString() };
        savePlayers(db);
      }
      return db[key];
    } catch (err) {
      console.error('API registerPlayer error:', err);
      return null;
    }
  }

  // ── saveRun ──────────────────────────────────────────────
  async function saveRun(playerId, runData) {
    try {
      const runs = loadRuns();
      const run = {
        id:                uid(),
        player_id:         playerId,
        highest_level:     runData.highestLevel      || 1,
        levels_completed:  runData.levelsCompleted   || 0,
        deaths:            runData.deaths            || 0,
        play_time_ms:      runData.playTimeMs        || 0,
        best_level_time_ms:runData.bestLevelTimeMs   || 0,
        completed:         runData.completed         || false,
        created_at:        new Date().toISOString()
      };
      runs.push(run);
      // Keep last 500 runs to avoid bloat
      if (runs.length > 500) runs.splice(0, runs.length - 500);
      saveRuns(runs);
      return { success: true };
    } catch (err) {
      console.error('API saveRun error:', err);
      return null;
    }
  }

  // ── getLeaderboard ───────────────────────────────────────
  async function getLeaderboard() {
    try {
      const db   = loadPlayers();
      const runs = loadRuns();

      // Aggregate per player
      const agg = {};
      runs.forEach(r => {
        const pid = r.player_id;
        if (!agg[pid]) {
          agg[pid] = {
            player_id:            pid,
            best_highest_level:   0,
            best_levels_completed:0,
            fewest_deaths:        Infinity,
            best_time_ms:         Infinity,
            total_runs:           0
          };
        }
        const a = agg[pid];
        a.total_runs++;
        if (r.highest_level > a.best_highest_level)      a.best_highest_level   = r.highest_level;
        if (r.levels_completed > a.best_levels_completed) a.best_levels_completed= r.levels_completed;
        if (r.deaths < a.fewest_deaths)                   a.fewest_deaths        = r.deaths;
        if (r.play_time_ms > 0 && r.play_time_ms < a.best_time_ms) a.best_time_ms = r.play_time_ms;
      });

      // Attach player names and sort
      const entries = Object.values(agg)
        .map(a => {
          const p = Object.values(db).find(p => p.id === a.player_id);
          return {
            name:                  p ? p.name : '???',
            best_highest_level:    a.best_highest_level,
            best_levels_completed: a.best_levels_completed,
            fewest_deaths:         a.fewest_deaths === Infinity ? 0 : a.fewest_deaths,
            best_time_ms:          a.best_time_ms  === Infinity ? 0 : a.best_time_ms,
            total_runs:            a.total_runs
          };
        })
        .sort((a, b) =>
          b.best_highest_level - a.best_highest_level ||
          b.best_levels_completed - a.best_levels_completed ||
          a.fewest_deaths - b.fewest_deaths ||
          a.best_time_ms  - b.best_time_ms
        )
        .slice(0, 100);

      return entries;
    } catch (err) {
      console.error('API getLeaderboard error:', err);
      return [];
    }
  }

  // ── getPlayerRecord ──────────────────────────────────────
  async function getPlayerRecord(name) {
    try {
      const db  = loadPlayers();
      const key = name.toLowerCase().trim();
      const p   = db[key];
      if (!p) return null;

      const runs = loadRuns().filter(r => r.player_id === p.id);
      if (!runs.length) return null;

      const record = {
        best_highest_level:    0,
        best_levels_completed: 0,
        fewest_deaths:         Infinity,
        best_time_ms:          Infinity,
        total_runs:            runs.length
      };
      runs.forEach(r => {
        if (r.highest_level    > record.best_highest_level)    record.best_highest_level    = r.highest_level;
        if (r.levels_completed > record.best_levels_completed) record.best_levels_completed = r.levels_completed;
        if (r.deaths           < record.fewest_deaths)         record.fewest_deaths         = r.deaths;
        if (r.play_time_ms > 0 && r.play_time_ms < record.best_time_ms) record.best_time_ms = r.play_time_ms;
      });
      if (record.fewest_deaths === Infinity) record.fewest_deaths = 0;
      if (record.best_time_ms  === Infinity) record.best_time_ms  = 0;

      return {
        player: p,
        record,
        runs: runs
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
          .map(r => ({
            highest_level:  r.highest_level,
            deaths:         r.deaths,
            play_time_ms:   r.play_time_ms,
            created_at:     r.created_at
          }))
      };
    } catch (err) {
      console.error('API getPlayerRecord error:', err);
      return null;
    }
  }

  return { registerPlayer, saveRun, getLeaderboard, getPlayerRecord };
})();
