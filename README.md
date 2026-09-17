# 🎮 TRAP RUN

A challenging 2D trap-based platformer with local multiplayer and persistent leaderboard. Multiple players can take turns on the same laptop competing for the highest level and fewest deaths.

## Setup

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

## How to Play

1. **Enter your name** and press START GAME
2. **Move** with Arrow Keys or WASD
3. **Jump** with Space or Up Arrow / W
4. **Survive** traps and reach the exit door on each level
5. **Die?** Press PLAY AGAIN to retry the same level
6. **Quit your run** to save your record to the leaderboard
7. **New Player** — let someone else take a turn!

## Controls

| Action | Keys |
|--------|------|
| Move Left | ← or A |
| Move Right | → or D |
| Jump | Space, ↑, or W |

## Features

- 20 challenging levels with increasing difficulty
- 14 trap types (hidden spikes, disappearing platforms, gravity flips, fake exits, and more)
- Persistent leaderboard (SQLite database)
- Local multiplayer — take turns on one laptop
- Personal records and run history
- Procedural audio and pixel-art graphics
- Responsive design with mobile touch controls

## Tech Stack

- **Frontend**: HTML5 Canvas, Vanilla JavaScript, CSS3
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Audio**: Web Audio API (procedural)
