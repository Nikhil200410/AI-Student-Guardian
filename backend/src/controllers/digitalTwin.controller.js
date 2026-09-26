// digitalTwin.controller.js
// GET /api/digital-twin/overview only — a lightweight, read-only summary
// pulled from the Phase 2 resource tables for the dashboard's Overview
// section. It does NOT duplicate detailed records; each resource's own
// endpoint remains the source of truth for its full data.

const db = require("../db");

async function getOverview(req, res) {
  const userId = req.userId;
  try {
    const [profileResult, educationResult, goalsResult, skillsResult, interestsResult, preferencesResult, availabilityResult, hobbiesResult] =
      await Promise.all([
        db.query("SELECT name FROM student_profile WHERE user_id = $1", [userId]),
        db.query(
          `SELECT degree_type, discipline, current_year, current_semester
           FROM education_records WHERE user_id = $1 AND is_current = true`,
          [userId]
        ),
        db.query("SELECT status, COUNT(*)::int AS count FROM goals WHERE user_id = $1 GROUP BY status", [userId]),
        db.query("SELECT status, COUNT(*)::int AS count FROM skills WHERE user_id = $1 GROUP BY status", [userId]),
        db.query("SELECT COUNT(*)::int AS count FROM interests WHERE user_id = $1", [userId]),
        db.query("SELECT id, weekly_available_hours FROM student_preferences WHERE user_id = $1", [userId]),
        db.query(
          `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)::float AS total_hours
           FROM availability_slots WHERE user_id = $1`,
          [userId]
        ),
        db.query("SELECT COUNT(*)::int AS count FROM hobbies_commitments WHERE user_id = $1", [userId]),
      ]);

    const goalCounts = { active: 0, completed: 0, paused: 0, abandoned: 0 };
    for (const row of goalsResult.rows) goalCounts[row.status] = row.count;

    const skillCounts = { claimed: 0, demonstrated: 0 };
    for (const row of skillsResult.rows) skillCounts[row.status] = row.count;

    const preferencesConfigured = preferencesResult.rows.length > 0;
    const weeklyAvailableHoursFromPreferences = preferencesConfigured
      ? preferencesResult.rows[0].weekly_available_hours
      : null;

    return res.json({
      profileName: profileResult.rows[0]?.name || null,
      currentEducation: educationResult.rows[0] || null,
      goalCounts,
      skillCounts,
      interestCount: interestsResult.rows[0].count,
      preferencesConfigured,
      weeklyAvailableHoursFromPreferences,
      weeklyAvailabilityHoursFromSlots: availabilityResult.rows[0].total_hours,
      hobbyCount: hobbiesResult.rows[0].count,
    });
  } catch (err) {
    console.error("getOverview error:", err);
    return res.status(500).json({ error: "Could not load the Digital Twin overview." });
  }
}

module.exports = { getOverview };
