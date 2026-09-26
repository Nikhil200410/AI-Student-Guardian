-- Phase 2 migration: Student Digital Twin Foundation.
-- Run this AFTER schema.sql and schema_phase1.sql, against the same database:
--   psql "$DATABASE_URL" -f backend/src/db/schema_phase2.sql
--
-- What changes:
--   1. New tables: education_records, goals, skill_categories, skills,
--      skill_evidence, interests, student_preferences, availability_slots,
--      hobbies_commitments.
--   2. Existing student_profile rows' degree/department/semester are copied
--      into education_records BEFORE those columns are dropped from
--      student_profile — no data is lost.
--
-- This file does not touch schema.sql or schema_phase1.sql.

-- ============================================================
-- 1. education_records
-- ============================================================
CREATE TABLE IF NOT EXISTS education_records (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  degree_type       VARCHAR(120) NOT NULL,
  discipline        VARCHAR(120) NOT NULL,
  institution       VARCHAR(200),
  current_year      INTEGER,
  current_semester  INTEGER CHECK (current_semester BETWEEN 1 AND 12),
  is_current        BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_records_user_id ON education_records (user_id);

-- Enforces "one current education record per student" (multiple non-current
-- historical records will be allowed later without any schema change).
CREATE UNIQUE INDEX IF NOT EXISTS idx_education_records_one_current
  ON education_records (user_id)
  WHERE is_current = true;

-- ============================================================
-- 2. goals
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type    VARCHAR(20) NOT NULL CHECK (goal_type IN ('short_term', 'long_term')),
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  priority     VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  target_date  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);

-- ============================================================
-- 3. skill_categories (lookup table — extend by inserting rows, no migration needed)
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO skill_categories (name) VALUES
  ('Programming Languages'),
  ('Frameworks & Libraries'),
  ('Databases'),
  ('Web Development'),
  ('Mobile Development'),
  ('AI & Machine Learning'),
  ('Data Science'),
  ('Cloud & DevOps'),
  ('Cybersecurity'),
  ('Data Structures & Algorithms'),
  ('Tools & Platforms'),
  ('Soft Skills'),
  ('Domain Knowledge'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. skills
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id            INTEGER NOT NULL REFERENCES skill_categories(id),
  custom_category_label  VARCHAR(120), -- only meaningful when category = "Other"
  name                   VARCHAR(120) NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'claimed'
                         CHECK (status IN ('claimed', 'demonstrated')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills (user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills (category_id);

-- ============================================================
-- 5. skill_evidence
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_evidence (
  id             SERIAL PRIMARY KEY,
  skill_id       INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  evidence_type  VARCHAR(20) NOT NULL
                 CHECK (evidence_type IN ('project', 'certificate', 'coding_problem', 'other')),
  description    TEXT NOT NULL,
  link           VARCHAR(500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_skill_id ON skill_evidence (skill_id);

-- ============================================================
-- 6. interests
-- ============================================================
CREATE TABLE IF NOT EXISTS interests (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_interests_user_id ON interests (user_id);

-- ============================================================
-- 7. student_preferences
--    Dropdown values are enforced at BOTH the app layer (see
--    backend/src/utils/preferenceOptions.js) and the DB layer (CHECK below),
--    per the approved decision. Extending the allowed values later requires
--    a small migration to adjust the CHECK constraint, and a matching
--    one-line change to preferenceOptions.js.
-- ============================================================
CREATE TABLE IF NOT EXISTS student_preferences (
  id                         SERIAL PRIMARY KEY,
  user_id                    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  learning_style             VARCHAR(30) CHECK (learning_style IN ('visual', 'hands_on', 'reading', 'mixed')),
  progression_style          VARCHAR(30) CHECK (progression_style IN ('gradual', 'challenge_first')),
  preferred_study_time       VARCHAR(30) CHECK (preferred_study_time IN ('morning', 'afternoon', 'evening', 'night')),
  recommendation_frequency   VARCHAR(20) CHECK (recommendation_frequency IN ('daily', 'weekly', 'biweekly')),
  weekly_available_hours     INTEGER CHECK (weekly_available_hours >= 0),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. availability_slots
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  VARCHAR(10) NOT NULL
               CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_user_id ON availability_slots (user_id);

-- ============================================================
-- 9. hobbies_commitments
-- ============================================================
CREATE TABLE IF NOT EXISTS hobbies_commitments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  description      TEXT,
  time_commitment  VARCHAR(60),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hobbies_commitments_user_id ON hobbies_commitments (user_id);

-- ============================================================
-- 10. Migrate existing student_profile education data BEFORE dropping columns
--     current_year is intentionally left NULL — Phase 0/1 never collected a
--     "year" value (only semester), so there is nothing to migrate it from.
--     Do NOT guess it from semester.
-- ============================================================
INSERT INTO education_records (user_id, degree_type, discipline, current_year, current_semester, is_current)
SELECT user_id, degree, department, NULL, semester, true
FROM student_profile
WHERE user_id IS NOT NULL
  AND degree IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM education_records er
    WHERE er.user_id = student_profile.user_id AND er.is_current = true
  );

-- ============================================================
-- 11. Only now, after the data above is safely copied, narrow student_profile.
-- ============================================================
ALTER TABLE student_profile DROP COLUMN IF EXISTS degree;
ALTER TABLE student_profile DROP COLUMN IF EXISTS department;
ALTER TABLE student_profile DROP COLUMN IF EXISTS semester;
