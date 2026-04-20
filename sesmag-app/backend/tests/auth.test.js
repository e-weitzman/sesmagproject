// tests/auth.test.js – SESMag HR Portal
// Run: npm test  (no live DB required – pool is fully mocked)

const request = require('supertest');

// jest.mock is hoisted; cannot reference outer-scope variables.
// Pre-computed bcrypt hash of 'Password1!' (cost 10):
jest.mock('../db/pool', () => {
  const HASH = '$2a$10$lTqjJhR/3J81eBhWxPWMlO6Gwbqq1e1IdaVKO/OzS1L.t0PgTAQva';
  const mockUsers = [
    { id:'test-uuid-001', username:'test_employee', email:'employee@test.com',
      password_hash:HASH, role:'employee', first_name:'Test', last_name:'Employee',
      font_size_pref:'medium', color_theme:'light', reduce_motion:false,
      screen_reader_mode:false, tech_comfort_level:3, is_active:true },
    { id:'test-uuid-002', username:'test_manager', email:'manager@test.com',
      password_hash:HASH, role:'manager', first_name:'Test', last_name:'Manager',
      font_size_pref:'medium', color_theme:'dark', reduce_motion:false,
      screen_reader_mode:false, tech_comfort_level:5, is_active:true },
  ];
  return {
    query: jest.fn(async (sql, params) => {
      if (sql.includes('SELECT id, username') && params && params.length===1) {
        const user = mockUsers.find(u => u.username === params[0]);
        return { rows: user ? [user] : [] };
      }
      if (sql.includes('INSERT INTO sessions'))  return { rows: [] };
      if (sql.includes('FROM sessions s')) {
        return { rows: [{ user_id:'test-uuid-001', role:'employee', username:'test_employee',
          first_name:'Test', last_name:'Employee', font_size_pref:'medium',
          color_theme:'light', reduce_motion:false, screen_reader_mode:false, tech_comfort_level:3 }] };
      }
      if (sql.includes('DELETE FROM sessions'))  return { rows: [] };
      if (sql.includes('INSERT INTO users') && params && params[1]==='duplicate') {
        const e = new Error('dup'); e.code='23505'; throw e;
      }
      if (sql.includes('INSERT INTO users') && params) {
        return { rows:[{ id:'new-uuid', username:params[1], email:params[2],
          role:'employee', first_name:params[4], last_name:params[5] }] };
      }
      return { rows: [] };
    }),
  };
});

const app = require('../server');

// ── Health ─────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns { status:"ok" }', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });
});

// ── 404 ────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404', async () => {
    const r = await request(app).get('/api/does-not-exist');
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('Not found');
  });
});

// ── Login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('400 when body is empty', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
  });
  it('401 for unknown username', async () => {
    expect((await request(app).post('/api/auth/login').send({ username:'nobody', password:'x' })).status).toBe(401);
  });
  it('401 for wrong password', async () => {
    expect((await request(app).post('/api/auth/login').send({ username:'test_employee', password:'wrong' })).status).toBe(401);
  });
  it('200 + token for valid credentials', async () => {
    const r = await request(app).post('/api/auth/login').send({ username:'test_employee', password:'Password1!' });
    expect(r.status).toBe(200);
    expect(typeof r.body.token).toBe('string');
    expect(r.body.token.length).toBeGreaterThan(20);
  });
  it('never leaks password_hash', async () => {
    const r = await request(app).post('/api/auth/login').send({ username:'test_employee', password:'Password1!' });
    expect(r.body.user.password_hash).toBeUndefined();
  });
  it('returns correct username', async () => {
    const r = await request(app).post('/api/auth/login').send({ username:'test_employee', password:'Password1!' });
    expect(r.body.user.username).toBe('test_employee');
  });
});

// ── Register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201 for valid payload', async () => {
    const r = await request(app).post('/api/auth/register')
      .send({ username:'newuser', email:'new@test.com', password:'Pass1!', first_name:'New', last_name:'User' });
    expect(r.status).toBe(201);
    expect(r.body.user.username).toBe('newuser');
  });
  it('400 when fields missing', async () => {
    expect((await request(app).post('/api/auth/register').send({ username:'u' })).status).toBe(400);
  });
  it('409 on duplicate key', async () => {
    const r = await request(app).post('/api/auth/register')
      .send({ username:'duplicate', email:'d@test.com', password:'Pass1!', first_name:'D', last_name:'U' });
    expect(r.status).toBe(409);
  });
});

// ── Logout ─────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('401 without token', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
  });
  it('200 with valid token', async () => {
    const { body:{ token } } = await request(app).post('/api/auth/login')
      .send({ username:'test_employee', password:'Password1!' });
    const r = await request(app).post('/api/auth/logout').set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.message).toMatch(/logged out/i);
  });
});

// ── requireRole (unit) ─────────────────────────────────────────
describe('requireRole middleware', () => {
  const { requireRole } = require('../middleware/auth');
  const mkRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  it('calls next() when role matches', () => {
    const next = jest.fn();
    requireRole('manager')({ user:{ role:'manager' } }, mkRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
  it('returns 403 when role does not match', () => {
    const res = mkRes(); const next = jest.fn();
    requireRole('admin')({ user:{ role:'employee' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('returns 403 when user is undefined', () => {
    const res = mkRes(); const next = jest.fn();
    requireRole('admin')({}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('accepts multiple allowed roles', () => {
    const next = jest.fn();
    requireRole('employee','manager')({ user:{ role:'employee' } }, mkRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ── errorHandler (unit) ────────────────────────────────────────
describe('errorHandler middleware', () => {
  const { errorHandler } = require('../middleware/errorHandler');
  const mkReq = () => ({ method:'GET', originalUrl:'/test' });
  const mkRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  it('uses the error status for 4xx', () => {
    const err = Object.assign(new Error('Bad'), { status:400 });
    const res = mkRes();
    errorHandler(err, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error:'Bad' }));
  });
  it('returns generic message for 500', () => {
    const res = mkRes();
    errorHandler(new Error('DB crash'), mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error:'Internal server error' }));
  });
});
