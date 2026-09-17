const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const { initDB, saveToDisk } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', apiRoutes);

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Initialize DB then start server
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🎮 TRAP RUN server running at http://localhost:${PORT}`);
    });

    // Save database on shutdown
    process.on('SIGINT', () => {
      console.log('\n💾 Saving database...');
      saveToDisk();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      saveToDisk();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
