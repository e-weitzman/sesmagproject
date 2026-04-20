-- ============================================================
--  SESMag HR Portal – Seed Data
--  Personas: DAV + representative SESMag diversity set
-- ============================================================

-- Departments
INSERT INTO departments (name) VALUES
    ('Engineering'),
    ('Human Resources'),
    ('Product & Design'),
    ('Operations'),
    ('Customer Success')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
--  USERS  (passwords are bcrypt of 'Password1!')
-- ─────────────────────────────────────────────
INSERT INTO users (
    username, email, password_hash,
    role, first_name, last_name, pronouns,
    department, job_title, hire_date,
    bio, phone,
    preferred_language, font_size_pref, color_theme,
    reduce_motion, screen_reader_mode, tech_comfort_level
) VALUES
-- Admin
('admin',
 'admin@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'admin', 'System', 'Admin', NULL,
 'Operations', 'System Administrator', '2020-01-01',
 'Platform administrator account.',
 '+1-555-000-0001',
 'en', 'medium', 'dark', FALSE, FALSE, 5),

-- Manager – Patricia (high-tech-savvy manager)
('patricia_m',
 'patricia@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'manager', 'Patricia', 'Martinez', 'she/her',
 'Engineering', 'Engineering Manager', '2021-03-15',
 'Experienced engineering leader. Loves automating everything.',
 '+1-555-100-0002',
 'en', 'medium', 'dark', FALSE, FALSE, 5),

-- DAV persona: low tech-comfort, prefers large fonts, high-contrast
('dav_persona',
 'dav@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'employee', 'DAV', 'Persona', 'they/them',
 'Customer Success', 'Customer Support Specialist', '2023-06-01',
 'Represents underserved SESMag persona. Prefers clear language and larger text.',
 '+1-555-200-0003',
 'en', 'xlarge', 'high-contrast', TRUE, FALSE, 2),

-- Tim persona: low income, mobile-first
('tim_c',
 'tim@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'employee', 'Tim', 'Chen', 'he/him',
 'Operations', 'Logistics Coordinator', '2022-09-10',
 'Primarily mobile user. Values fast load times and simple navigation.',
 '+1-555-300-0004',
 'en', 'large', 'light', FALSE, FALSE, 2),

-- Abi persona: screen reader, high accessibility needs
('abi_k',
 'abi@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'employee', 'Abi', 'Khan', 'she/her',
 'Product & Design', 'UX Researcher', '2022-01-20',
 'Screen reader user. Advocates for accessibility and inclusive design.',
 '+1-555-400-0005',
 'en', 'medium', 'high-contrast', TRUE, TRUE, 3),

-- Gary persona: older adult, low tech confidence
('gary_w',
 'gary@sesmag.org',
 '$2b$12$EiX3zNr9VHRm5c4UPLTwH.OcLdFuFR0uRaInGjNHy1vkdBz0t7WQW',
 'employee', 'Gary', 'Williams', 'he/him',
 'Human Resources', 'HR Generalist', '2019-07-01',
 'Prefers telephone calls over email. Learning to use digital systems.',
 '+1-555-500-0006',
 'en', 'xlarge', 'light', TRUE, FALSE, 1)
ON CONFLICT DO NOTHING;

-- Set manager_id for non-admin users (patricia manages the team)
UPDATE users
SET manager_id = (SELECT id FROM users WHERE username = 'patricia_m')
WHERE username IN ('dav_persona','tim_c','abi_k','gary_w');
