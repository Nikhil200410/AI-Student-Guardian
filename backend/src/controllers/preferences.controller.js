// preferences.controller.js
// One row per user, like student_profile. Allowed dropdown values are
// validated here AND enforced by CHECK constraints in schema_phase2.sql —
// this gives clear API error messages while the database stays protected
// even against a future client that skips this validation.

const db = require("../db");
const {
  LEARNING_STYLES,
  PROGRESSION_STYLES,
  STUDY_TIMES,
  RECOMMENDATION_FREQUENCIES,
} = require("../utils/preferenceOptions");

function validatePreferencesInput(body) {
  const errors = [];
  const { learning_style, progression_style, preferred_study_time, recommendation_frequency, weekly_available_hours } = body;

  if (learning_style !== undefined && learning_style !== null && !LEARNING_STYLES.includes(learning_style)) {
    errors.push(`learning_style must be one of: ${LEARNING_STYLES.join(", ")}`);
  }
  if (progression_style !== undefined && progression_style !== null && !PROGRESSION_STYLES.includes(progression_style)) {
    errors.push(`progression_style must be one of: ${PROGRESSION_STYLES.join(", ")}`);
  }
  if (preferred_study_time !== undefined && preferred_study_time !== null && !STUDY_TIMES.includes(preferred_study_time)) {
    errors.push(`preferred_study_time must be one of: ${STUDY_TIMES.join(", ")}`);
  }
  if (
    recommendation_frequency !== undefined &&
    recommendation_frequency !== null &&
    !RECOMMENDATION_FREQUENCIES.includes(recommendation_frequency)
  ) {
    errors.push(`recommendation_frequency must be one of: ${RECOMMENDATION_FREQUENCIES.join(", ")}`);
  }

  let hoursNum = null;
  if (weekly_available_hours !== undefined && weekly_available_hours !== null && weekly_available_hours !== "") {
    hoursNum = Number(weekly_available_hours);
    if (!Number.isInteger(hoursNum) || hoursNum < 0) {
      errors.push("weekly_available_hours must be a whole number of 0 or more.");
    }
  }

  return { errors, hoursNum };
}

// GET /api/preferences
async function getPreferences(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT learning_style, progression_style, preferred_study_time, recommendation_frequency,
              weekly_available_hours, created_at, updated_at
       FROM student_preferences WHERE user_id = $1`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Preferences have not been set yet." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("getPreferences error:", err);
    return res.status(500).json({ error: "Could not load preferences." });
  }
}

// POST /api/preferences — creates the row. Fails with 409 if it already exists.
async function createPreferences(req, res) {
  const { errors, hoursNum } = validatePreferencesInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { learning_style, progression_style, preferred_study_time, recommendation_frequency } = req.body;

  try {
    const existing = await db.query("SELECT id FROM student_preferences WHERE user_id = $1", [req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Preferences already exist. Use PUT to update them." });
    }

    const { rows } = await db.query(
      `INSERT INTO student_preferences
         (user_id, learning_style, progression_style, preferred_study_time, recommendation_frequency, weekly_available_hours)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING learning_style, progression_style, preferred_study_time, recommendation_frequency,
                 weekly_available_hours, created_at, updated_at`,
      [req.userId, learning_style || null, progression_style || null, preferred_study_time || null, recommendation_frequency || null, hoursNum]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createPreferences error:", err);
    return res.status(500).json({ error: "Could not save preferences." });
  }
}

// PUT /api/preferences
async function updatePreferences(req, res) {
  const { errors, hoursNum } = validatePreferencesInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { learning_style, progression_style, preferred_study_time, recommendation_frequency } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE student_preferences
       SET learning_style = $1, progression_style = $2, preferred_study_time = $3,
           recommendation_frequency = $4, weekly_available_hours = $5, updated_at = now()
       WHERE user_id = $6
       RETURNING learning_style, progression_style, preferred_study_time, recommendation_frequency,
                 weekly_available_hours, created_at, updated_at`,
      [learning_style || null, progression_style || null, preferred_study_time || null, recommendation_frequency || null, hoursNum, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Preferences have not been set yet. Use POST to create them." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("updatePreferences error:", err);
    return res.status(500).json({ error: "Could not update preferences." });
  }
}

module.exports = { getPreferences, createPreferences, updatePreferences };
