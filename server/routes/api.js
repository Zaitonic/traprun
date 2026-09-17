const express = require('express');
const router = express.Router();
const { getOrCreatePlayer, saveRun, getLeaderboard, getPlayerRecord } = require('../db');

// Input validation helpers
function sanitizeName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/[<>&"'\/\\]/g, '');
  if (trimmed.length < 1 || trimmed.length > 20) return null;
  return trimmed;
}

function isValidNumber(val, min = 0, max = 999999) {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max;
}

// GET /api/health — Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// POST /api/player — Register or find player
router.post('/player', (req, res) => {
  try {
    const name = sanitizeName(req.body.name);
    if (!name) {
      return res.status(400).json({ error: 'Invalid player name. Must be 1-20 characters.' });
    }
    const player = getOrCreatePlayer(name);
    res.json({ success: true, player });
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/run/save — Save a completed run
router.post('/run/save', (req, res) => {
  try {
    const { playerId, highestLevel, levelsCompleted, deaths, playTimeMs, bestLevelTimeMs, completed } = req.body;

    if (!isValidNumber(playerId, 1)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    if (!isValidNumber(highestLevel, 1, 100)) {
      return res.status(400).json({ error: 'Invalid highest level' });
    }
    if (!isValidNumber(levelsCompleted, 0, 100)) {
      return res.status(400).json({ error: 'Invalid levels completed' });
    }
    if (!isValidNumber(deaths, 0, 999999)) {
      return res.status(400).json({ error: 'Invalid death count' });
    }
    if (!isValidNumber(playTimeMs, 0, 999999999)) {
      return res.status(400).json({ error: 'Invalid play time' });
    }

    const run = saveRun(playerId, {
      highestLevel: Math.floor(highestLevel),
      levelsCompleted: Math.floor(levelsCompleted),
      deaths: Math.floor(deaths),
      playTimeMs: Math.round(playTimeMs),
      bestLevelTimeMs: Math.round(bestLevelTimeMs || 0),
      completed: !!completed
    });

    res.json({ success: true, runId: run ? run.id : null });
  } catch (err) {
    console.error('Error saving run:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leaderboard — Top 100 entries
router.get('/leaderboard', (req, res) => {
  try {
    const entries = getLeaderboard();
    res.json({ success: true, entries });
  } catch (err) {
    console.error('Error getting leaderboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/player/:name/record — Personal record + run history
router.get('/player/:name/record', (req, res) => {
  try {
    const name = sanitizeName(req.params.name);
    if (!name) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    const data = getPlayerRecord(name);
    if (!data) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error getting record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
