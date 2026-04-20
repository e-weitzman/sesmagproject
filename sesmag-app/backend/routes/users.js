// routes/users.js
const express  = require('express');
const { query }  = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// ── GET /api/users  (manager/admin: all users; employee: self only) ─────
router.get('/', async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'employee') {
      // Employees can only see themselves
      ({ rows } = await query(
        `SELECT id, username, email, role, first_name, last_name, pronouns,
                department, job_title, hire_date, bio, phone, avatar_url,
                preferred_language, font_size_pref, color_theme,
                reduce_motion, screen_reader_mode, tech_comfort_level,
                is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [req.user.user_id]
      ));
    } else {
      // Managers see their direct reports; admins see everyone
      const clause = req.user.role === 'manager'
        ? 'WHERE manager_id = $1 OR id = $1'
        : 'WHERE TRUE';
      ({ rows } = await query(
        `SELECT id, username, email, role, first_name, last_name, pronouns,
                department, job_title, hire_date, bio, phone, avatar_url,
                preferred_language, font_size_pref, color_theme,
                reduce_motion, screen_reader_mode, tech_comfort_level,
                is_active, manager_id, created_at, updated_at
         FROM users ${clause} ORDER BY last_name, first_name`,
        req.user.role === 'manager' ? [req.user.user_id] : []
      ));
    }
    res.json({ users: rows });
  } catch (err) { next(err); }
});

// ── GET /api/users/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Employees can only view their own profile
    if (req.user.role === 'employee' && id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
              u.pronouns, u.department, u.job_title, u.hire_date, u.bio,
              u.phone, u.avatar_url, u.preferred_language, u.font_size_pref,
              u.color_theme, u.reduce_motion, u.screen_reader_mode,
              u.tech_comfort_level, u.is_active, u.created_at, u.updated_at,
              m.first_name AS manager_first_name, m.last_name AS manager_last_name
       FROM users u
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/:id ─────────────────────────────────────────────────
const EMPLOYEE_ALLOWED = new Set([
  'first_name','last_name','pronouns','phone','bio','avatar_url',
  'preferred_language','font_size_pref','color_theme','reduce_motion',
  'screen_reader_mode','tech_comfort_level',
]);
const MANAGER_ALLOWED = new Set([
  ...EMPLOYEE_ALLOWED,
  'department','job_title','is_active',
]);

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSelf  = id === req.user.user_id;
    const isAdmin = req.user.role === 'admin';
    const isMgr   = req.user.role === 'manager';

    if (!isSelf && !isAdmin && !isMgr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowed = isAdmin
      ? null                // admins can update anything
      : isMgr ? MANAGER_ALLOWED : EMPLOYEE_ALLOWED;

    const updates = [];
    const values  = [];
    const changes = [];

    // Fetch current row for change log
    const { rows: current } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!current.length) return res.status(404).json({ error: 'User not found' });
    const oldRow = current[0];

    for (const [key, val] of Object.entries(req.body)) {
      if (allowed && !allowed.has(key)) continue; // silently skip unauthorized fields
      updates.push(`${key} = $${values.length + 2}`);
      values.push(val);
      if (String(oldRow[key]) !== String(val)) {
        changes.push({ field: key, old: oldRow[key], new: val });
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    // Log changes for manager visibility
    for (const c of changes) {
      await query(
        `INSERT INTO profile_changes (user_id, changed_by, field_name, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, req.user.user_id, c.field, String(c.old ?? ''), String(c.new ?? '')]
      );
    }

    const { password_hash, ...safeUser } = rows[0];
    res.json({ user: safeUser, changesLogged: changes.length });
  } catch (err) { next(err); }
});

// ── GET /api/users/:id/changes  (manager/admin only) ────────────────────
router.get('/:id/changes', requireRole('manager','admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT pc.*, u.first_name || ' ' || u.last_name AS changed_by_name
       FROM profile_changes pc
       JOIN users u ON u.id = pc.changed_by
       WHERE pc.user_id = $1
       ORDER BY pc.changed_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ changes: rows });
  } catch (err) { next(err); }
});

// ── DELETE /api/users/:id  (admin only) ─────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
