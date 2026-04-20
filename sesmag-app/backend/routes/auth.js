// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { query }    = require('../db/pool');
const { SECRET }   = require('../middleware/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    const { rows } = await query(
      `SELECT id, username, password_hash, role, first_name, last_name,
              font_size_pref, color_theme, reduce_motion, screen_reader_mode,
              tech_comfort_level, is_active
       FROM users WHERE username = $1`,
      [username]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });

    // Persist session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (id, user_id, token, expires_at) VALUES ($1,$2,$3,$4)`,
      [uuid(), user.id, token, expiresAt]
    );

    // Return user profile + token (no password hash)
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query(`DELETE FROM sessions WHERE token = $1`, [req.token]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/register  (admin only in prod) ─────────────
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, first_name, last_name, role = 'employee' } = req.body;
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    const { rows } = await query(
      `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, username, email, role, first_name, last_name`,
      [uuid(), username, email, hash, first_name, last_name, role]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    next(err);
  }
});

module.exports = router;
