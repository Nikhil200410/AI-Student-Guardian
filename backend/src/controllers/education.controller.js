// education.controller.js
// Manages education_records. Phase 2 only ever shows/edits the ONE row
// where is_current = true for a user, even though the table itself already
// supports multiple rows per user (future: past degrees, dual degrees).

const db = require("../db");

function validateEducationInput(body) {
  const errors = [];
  const { degree_type, discipline, institution, current_year, current_semester } = body;

  if (!degree_type || typeof degree_type !== "string" || !degree_type.trim()) {
    errors.push("degree_type is required.");
  }
  if (!discipline || typeof discipline !== "string" || !discipline.trim()) {
    errors.push("discipline is required.");
  }
  if (institution !== undefined && institution !== null && typeof institution !== "string") {
    errors.push("institution must be a string.");
  }

  let yearNum = null;
  if (current_year !== undefined && current_year !== null && current_year !== "") {
    yearNum = Number(current_year);
    if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 10) {
      errors.push("current_year must be a whole number between 1 and 10.");
    }
  }

  let semesterNum = null;
  if (current_semester !== undefined && current_semester !== null && current_semester !== "") {
    semesterNum = Number(current_semester);
    if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 12) {
      errors.push("current_semester must be a whole number between 1 and 12.");
    }
  }

  return { errors, yearNum, semesterNum };
}

// GET /api/education — list all education records for this user
async function listEducation(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, degree_type, discipline, institution, current_year, current_semester,
              is_current, created_at, updated_at
       FROM education_records WHERE user_id = $1 ORDER BY is_current DESC, created_at DESC`,
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listEducation error:", err);
    return res.status(500).json({ error: "Could not load education records." });
  }
}

// GET /api/education/current
async function getCurrentEducation(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, degree_type, discipline, institution, current_year, current_semester,
              is_current, created_at, updated_at
       FROM education_records WHERE user_id = $1 AND is_current = true`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No current education record yet." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("getCurrentEducation error:", err);
    return res.status(500).json({ error: "Could not load your current education record." });
  }
}

// POST /api/education — creates the current education record.
// Fails with 409 if a current record already exists (use PUT to edit it).
async function createEducation(req, res) {
  const { errors, yearNum, semesterNum } = validateEducationInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { degree_type, discipline, institution } = req.body;

  try {
    const existing = await db.query(
      "SELECT id FROM education_records WHERE user_id = $1 AND is_current = true",
      [req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "A current education record already exists. Use PUT to update it.",
      });
    }

    const { rows } = await db.query(
      `INSERT INTO education_records (user_id, degree_type, discipline, institution, current_year, current_semester, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, degree_type, discipline, institution, current_year, current_semester, is_current, created_at, updated_at`,
      [req.userId, degree_type.trim(), discipline.trim(), institution ? institution.trim() : null, yearNum, semesterNum]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createEducation error:", err);
    return res.status(500).json({ error: "Could not create the education record." });
  }
}

// PUT /api/education/:id — the id must belong to this user (ownership check).
async function updateEducation(req, res) {
  const { errors, yearNum, semesterNum } = validateEducationInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { degree_type, discipline, institution } = req.body;
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      `UPDATE education_records
       SET degree_type = $1, discipline = $2, institution = $3, current_year = $4,
           current_semester = $5, updated_at = now()
       WHERE id = $6 AND user_id = $7
       RETURNING id, degree_type, discipline, institution, current_year, current_semester, is_current, created_at, updated_at`,
      [degree_type.trim(), discipline.trim(), institution ? institution.trim() : null, yearNum, semesterNum, id, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Education record not found." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("updateEducation error:", err);
    return res.status(500).json({ error: "Could not update the education record." });
  }
}

// DELETE /api/education/:id
async function deleteEducation(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query(
      "DELETE FROM education_records WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Education record not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteEducation error:", err);
    return res.status(500).json({ error: "Could not delete the education record." });
  }
}

module.exports = { listEducation, getCurrentEducation, createEducation, updateEducation, deleteEducation };
