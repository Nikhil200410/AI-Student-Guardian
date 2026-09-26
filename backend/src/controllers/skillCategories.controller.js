// skillCategories.controller.js
// Read-only: skill_categories is a lookup table seeded by the migration.
// No create/update/delete endpoints in Phase 2 — categories are managed
// directly in the database for now (see schema_phase2.sql).

const db = require("../db");

// GET /api/skill-categories
async function listSkillCategories(req, res) {
  try {
    const { rows } = await db.query("SELECT id, name FROM skill_categories ORDER BY name ASC");
    return res.json(rows);
  } catch (err) {
    console.error("listSkillCategories error:", err);
    return res.status(500).json({ error: "Could not load skill categories." });
  }
}

module.exports = { listSkillCategories };
