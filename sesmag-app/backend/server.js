// server.js – SESMag HR Portal
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const { morganMiddleware } = require('./middleware/logger');
const { errorHandler }     = require('./middleware/errorHandler');
const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security / Infrastructure Middleware ──────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morganMiddleware);

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler (must be last)
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅  SESMag HR Portal API running on http://localhost:${PORT}`);
  });
}

module.exports = app; // export for tests
