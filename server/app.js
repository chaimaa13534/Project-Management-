/**
 * server/app.js
 * Point d'entrée principal — Express + Socket.io
 */
require('dotenv').config();

const express       = require('express');
const http          = require('http');
const path          = require('path');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');
const errorHandler  = require('./middleware/errorHandler');
const { initSocket } = require('./config/socket');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
initSocket(server);

// ── Sécurité ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour simplifier le dev
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' }
});
app.use('/api/', limiter);

// ── Logging & Parsing ─────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client')));

// ── Routes API ────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard',     require('./routes/dashboard'));

// ── SPA Fallback ──────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── Gestion globale des erreurs ───────────────────────────────
app.use(errorHandler);

// ── Démarrage ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀  Serveur démarré sur http://localhost:${PORT}`);
  console.log(`🌐  Mode : ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server };
