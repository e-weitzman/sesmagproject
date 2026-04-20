-- ============================================================
--  SESMag HR Portal – PostgreSQL Schema
--  CPS*3500 Homework – SESMag Inclusive Web Application
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
--  USERS  (employees / end-users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(60)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'employee'
                        CHECK (role IN ('employee','manager','admin')),

    -- Personal info
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    pronouns        VARCHAR(40),
    date_of_birth   DATE,
    phone           VARCHAR(30),
    avatar_url      TEXT,
    bio             TEXT,

    -- Accessibility / SESMag persona preferences
    preferred_language   VARCHAR(10)  NOT NULL DEFAULT 'en',
    font_size_pref       VARCHAR(10)  NOT NULL DEFAULT 'medium'
                             CHECK (font_size_pref IN ('small','medium','large','xlarge')),
    color_theme          VARCHAR(20)  NOT NULL DEFAULT 'light'
                             CHECK (color_theme IN ('light','dark','high-contrast','sepia')),
    reduce_motion        BOOLEAN      NOT NULL DEFAULT FALSE,
    screen_reader_mode   BOOLEAN      NOT NULL DEFAULT FALSE,
    tech_comfort_level   SMALLINT     NOT NULL DEFAULT 3
                             CHECK (tech_comfort_level BETWEEN 1 AND 5),

    -- Employment info
    department      VARCHAR(100),
    job_title       VARCHAR(100),
    hire_date       DATE,
    manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  PROFILE CHANGE LOG  (managers see this)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_changes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by  UUID NOT NULL REFERENCES users(id),
    field_name  VARCHAR(100) NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  DEPARTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    head_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
--  AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
--  INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_manager  ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_dept     ON users(department);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_changes_user   ON profile_changes(user_id);
