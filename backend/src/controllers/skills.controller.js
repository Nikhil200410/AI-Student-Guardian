// skills.controller.js
// Manages skills and their nested evidence. Key rule: a skill's status can
// only become "demonstrated" if at least one skill_evidence row already
// exists for it — checked here in the controller, not left to the client.

const db = require("../db");

const STATUSES = ["claimed", "demonstrated"];
const EVIDENCE_TYPES = ["project", "certificate", "coding_problem", "other"];

async function validateCategory(categoryId) {
  const { rows } = await db.query("SELECT id, name FROM skill_categories WHERE id = $1", [categoryId]);
  return rows[0] || null;
}

function validateSkillInput(body) {
  const errors = [];
  const { name, category_id, custom_category_label } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("name is required.");
  }
  const categoryIdNum = Number(category_id);
  if (!category_id || !Number.isInteger(categoryIdNum)) {
    errors.push("category_id is required and must refer to a valid skill category.");
  }
  if (custom_category_label !== undefined && custom_category_label !== null && typeof custom_category_label !== "string") {
    errors.push("custom_category_label must be a string.");
  }

  return { errors, categoryIdNum };
}

// GET /api/skills
async function listSkills(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.status, s.custom_category_label, s.created_at, s.updated_at,
              sc.id AS category_id, sc.name AS category_name
       FROM skills s
       JOIN skill_categories sc ON sc.id = s.category_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listSkills error:", err);
    return res.status(500).json({ error: "Could not load skills." });
  }
}

// POST /api/skills — always created as "claimed"; status can only change via PUT + evidence rule.
async function createSkill(req, res) {
  const { errors, categoryIdNum } = validateSkillInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { name, custom_category_label } = req.body;

  try {
    const category = await validateCategory(categoryIdNum);
    if (!category) {
      return res.status(400).json({ error: "category_id does not refer to a known skill category." });
    }

    const { rows } = await db.query(
      `INSERT INTO skills (user_id, category_id, custom_category_label, name, status)
       VALUES ($1, $2, $3, $4, 'claimed')
       RETURNING id, category_id, custom_category_label, name, status, created_at, updated_at`,
      [req.userId, categoryIdNum, custom_category_label ? custom_category_label.trim() : null, name.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation on (user_id, name)
      return res.status(409).json({ error: "You already have a skill with this name." });
    }
    console.error("createSkill error:", err);
    return res.status(500).json({ error: "Could not create the skill." });
  }
}

// PUT /api/skills/:id
// Handles name/category edits AND status changes. If status is being
// changed to "demonstrated", at least one evidence row must already exist.
async function updateSkill(req, res) {
  const { id } = req.params;
  const { name, category_id, custom_category_label, status } = req.body;

  const errors = [];
  if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
    errors.push("name cannot be empty.");
  }
  let categoryIdNum;
  if (category_id !== undefined) {
    categoryIdNum = Number(category_id);
    if (!Number.isInteger(categoryIdNum)) {
      errors.push("category_id must refer to a valid skill category.");
    }
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  try {
    // Ownership check first — also fetches current values to fall back on
    // for any field not being updated in this request.
    const existingResult = await db.query(
      "SELECT id, category_id, custom_category_label, name, status FROM skills WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Skill not found." });
    }
    const existing = existingResult.rows[0];

    if (categoryIdNum !== undefined) {
      const category = await validateCategory(categoryIdNum);
      if (!category) {
        return res.status(400).json({ error: "category_id does not refer to a known skill category." });
      }
    }

    const newStatus = status !== undefined ? status : existing.status;

    // THE RULE: cannot move to "demonstrated" without existing evidence.
    if (newStatus === "demonstrated" && existing.status !== "demonstrated") {
      const evidenceCheck = await db.query("SELECT id FROM skill_evidence WHERE skill_id = $1 LIMIT 1", [id]);
      if (evidenceCheck.rows.length === 0) {
        return res.status(400).json({
          error: "This skill cannot be marked as demonstrated until at least one piece of evidence has been added.",
        });
      }
    }

    const { rows } = await db.query(
      `UPDATE skills
       SET name = $1, category_id = $2, custom_category_label = $3, status = $4, updated_at = now()
       WHERE id = $5 AND user_id = $6
       RETURNING id, category_id, custom_category_label, name, status, created_at, updated_at`,
      [
        name !== undefined ? name.trim() : existing.name,
        categoryIdNum !== undefined ? categoryIdNum : existing.category_id,
        custom_category_label !== undefined ? (custom_category_label ? custom_category_label.trim() : null) : existing.custom_category_label,
        newStatus,
        id,
        req.userId,
      ]
    );
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "You already have a skill with this name." });
    }
    console.error("updateSkill error:", err);
    return res.status(500).json({ error: "Could not update the skill." });
  }
}

// DELETE /api/skills/:id
async function deleteSkill(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query("DELETE FROM skills WHERE id = $1 AND user_id = $2", [id, req.userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Skill not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteSkill error:", err);
    return res.status(500).json({ error: "Could not delete the skill." });
  }
}

// Helper: confirms this skill_id belongs to req.userId. Returns true/false.
async function userOwnsSkill(skillId, userId) {
  const { rows } = await db.query("SELECT id FROM skills WHERE id = $1 AND user_id = $2", [skillId, userId]);
  return rows.length > 0;
}

// GET /api/skills/:id/evidence
async function listEvidence(req, res) {
  const { id } = req.params;
  try {
    if (!(await userOwnsSkill(id, req.userId))) {
      return res.status(404).json({ error: "Skill not found." });
    }
    const { rows } = await db.query(
      "SELECT id, evidence_type, description, link, created_at FROM skill_evidence WHERE skill_id = $1 ORDER BY created_at DESC",
      [id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listEvidence error:", err);
    return res.status(500).json({ error: "Could not load evidence." });
  }
}

// POST /api/skills/:id/evidence
async function addEvidence(req, res) {
  const { id } = req.params;
  const { evidence_type, description, link } = req.body;

  const errors = [];
  if (!EVIDENCE_TYPES.includes(evidence_type)) {
    errors.push(`evidence_type must be one of: ${EVIDENCE_TYPES.join(", ")}`);
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    errors.push("description is required.");
  }
  if (link !== undefined && link !== null && typeof link !== "string") {
    errors.push("link must be a string.");
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  try {
    if (!(await userOwnsSkill(id, req.userId))) {
      return res.status(404).json({ error: "Skill not found." });
    }
    const { rows } = await db.query(
      `INSERT INTO skill_evidence (skill_id, evidence_type, description, link)
       VALUES ($1, $2, $3, $4)
       RETURNING id, evidence_type, description, link, created_at`,
      [id, evidence_type, description.trim(), link ? link.trim() : null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("addEvidence error:", err);
    return res.status(500).json({ error: "Could not add evidence." });
  }
}

// DELETE /api/skills/:id/evidence/:evidenceId
// Note: this can drop a skill's evidence count to zero even if it's already
// "demonstrated" — Phase 2 does not retroactively revert status on delete
// (the student remains in control of status; see PROJECT_DECISION_LOG.md).
async function deleteEvidence(req, res) {
  const { id, evidenceId } = req.params;
  try {
    if (!(await userOwnsSkill(id, req.userId))) {
      return res.status(404).json({ error: "Skill not found." });
    }
    const { rowCount } = await db.query(
      "DELETE FROM skill_evidence WHERE id = $1 AND skill_id = $2",
      [evidenceId, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Evidence not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteEvidence error:", err);
    return res.status(500).json({ error: "Could not delete evidence." });
  }
}

module.exports = {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listEvidence,
  addEvidence,
  deleteEvidence,
};
