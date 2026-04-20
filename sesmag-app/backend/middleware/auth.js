// middleware/auth.js
const jwt    = require('jsonwebtoken');
const { query } = require('../db/pool');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Verifies Bearer JWT and attaches req.user.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);

    // Check token hasn't been revoked (session row exists)
    const { rows } = await query(
      `SELECT s.id, u.id AS user_id, u.role, u.username, u.first_name,
              u.last_name, u.font_size_pref, u.color_theme,
              u.reduce_motion, u.screen_reader_mode, u.tech_comfort_level
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    req.user  = rows[0];
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Role-based guard. Usage: requireRole('manager','admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, SECRET };
