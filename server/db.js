const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'traprun.db');

let db = null;

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Save database to disk
function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Auto-save every 30 seconds
setInterval(saveToDisk, 30000);

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      highest_level INTEGER DEFAULT 1,
      levels_completed INTEGER DEFAULT 0,
      deaths INTEGER DEFAULT 0,
      play_time_ms INTEGER DEFAULT 0,
      best_level_time_ms INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_records (
      player_id INTEGER PRIMARY KEY,
      best_highest_level INTEGER DEFAULT 1,
      best_levels_completed INTEGER DEFAULT 0,
      fewest_deaths INTEGER DEFAULT 999999,
      best_time_ms INTEGER DEFAULT 999999999,
      total_runs INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  saveToDisk();
  console.log('📦 Database initialized at', DB_PATH);
  return db;
}

// Helper to get single row
function getRow(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// Helper to get all rows
function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Database functions
function getOrCreatePlayer(name) {
  let player = getRow('SELECT * FROM players WHERE name = ? COLLATE NOCASE', [name]);
  if (!player) {
    try {
      db.run('INSERT INTO players (name) VALUES (?)', [name]);
      const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      player = { id, name, created_at: new Date().toISOString() };
      saveToDisk();
    } catch (err) {
      player = getRow('SELECT * FROM players WHERE name = ? COLLATE NOCASE', [name]);
      if (!player) throw err;
    }
  }
  return player;
}

function saveRun(playerId, runData) {
  db.run(
    `INSERT INTO runs (player_id, highest_level, levels_completed, deaths, play_time_ms, best_level_time_ms, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      playerId,
      runData.highestLevel || 1,
      runData.levelsCompleted || 0,
      runData.deaths || 0,
      runData.playTimeMs || 0,
      runData.bestLevelTimeMs || 0,
      runData.completed ? 1 : 0
    ]
  );
  const runId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  // Check if record exists
  const existing = getRow('SELECT * FROM player_records WHERE player_id = ?', [playerId]);

  if (existing) {
    db.run(
      `UPDATE player_records SET
        best_highest_level = MAX(best_highest_level, ?),
        best_levels_completed = MAX(best_levels_completed, ?),
        fewest_deaths = MIN(fewest_deaths, ?),
        best_time_ms = CASE WHEN ? < best_time_ms THEN ? ELSE best_time_ms END,
        total_runs = total_runs + 1,
        updated_at = datetime('now')
      WHERE player_id = ?`,
      [
        runData.highestLevel || 1,
        runData.levelsCompleted || 0,
        runData.deaths != null ? runData.deaths : 999999,
        runData.playTimeMs || 999999999,
        runData.playTimeMs || 999999999,
        playerId
      ]
    );
  } else {
    db.run(
      `INSERT INTO player_records (player_id, best_highest_level, best_levels_completed, fewest_deaths, best_time_ms, total_runs, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        playerId,
        runData.highestLevel || 1,
        runData.levelsCompleted || 0,
        runData.deaths != null ? runData.deaths : 999999,
        runData.playTimeMs || 999999999
      ]
    );
  }

  saveToDisk();
  return { id: runId, success: true };
}

function getLeaderboard() {
  return getAll(
    `SELECT p.name, pr.best_highest_level, pr.best_levels_completed, pr.fewest_deaths, pr.best_time_ms, pr.total_runs, pr.updated_at
     FROM player_records pr
     JOIN players p ON p.id = pr.player_id
     ORDER BY pr.best_highest_level DESC, pr.best_levels_completed DESC, pr.fewest_deaths ASC, pr.best_time_ms ASC
     LIMIT 100`
  );
}

function getPlayerRecord(name) {
  const player = getRow('SELECT * FROM players WHERE name = ? COLLATE NOCASE', [name]);
  if (!player) return null;

  const record = getRow('SELECT * FROM player_records WHERE player_id = ?', [player.id]);
  const runs = getAll(
    'SELECT * FROM runs WHERE player_id = ? ORDER BY created_at DESC LIMIT 50',
    [player.id]
  );

  return {
    player,
    record: record || null,
    runs
  };
}

module.exports = {
  initDB,
  getOrCreatePlayer,
  saveRun,
  getLeaderboard,
  getPlayerRecord,
  saveToDisk
};
