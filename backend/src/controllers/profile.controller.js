// profile.controller.js
// "Controller" = the function that runs when a specific route is hit.
// It reads the request, talks to the database, and sends back a response.
// It does NOT decide the URL or HTTP method — that's the router's job (see routes/profile.routes.js).

const db = require("../db");

const ALLOWED_SEMESTERS = { min: 1, max: 12 };

function validateProfileInput(body) {
  const errors = [];
  const { name, degree, department, semester } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("name is required and must be a non-empty string");
  }
  if (!degree || typeof degree !== "string" || !degree.trim()) {
    errors.push("degree is required and must be a non-empty string");
  }
  if (!department || typeof department !== "string" || !department.trim()) {
    errors.push("department is required and must be a non-empty string");
  }
  const semesterNum = Number(semester);
  if (
    !Number.isInteger(semesterNum) ||
    semesterNum < ALLOWED_SEMESTERS.min ||
    semesterNum > ALLOWED_SEMESTERS.max
  ) {
    errors.push(
      `semester is required and must be a whole number between ${ALLOWED_SEMESTERS.min} and ${ALLOWED_SEMESTERS.max}`
    );
  }

  return { errors, semesterNum };
}

// GET /api/profile
// Returns the logged-in user's profile row, or 404 if they haven't created one yet.
async function getProfile(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, name, degree, department, semester, created_at, updated_at FROM student_profile WHERE user_id = $1",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No profile has been created yet." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ error: "Something went wrong while reading the profile." });
  }
}

// POST /api/profile
// Creates the logged-in user's profile row. Fails with 409 if one already exists
// (use PUT /api/profile to update an existing profile instead).
async function createProfile(req, res) {
  const { errors, semesterNum } = validateProfileInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { name, degree, department } = req.body;

  try {
    const existing = await db.query("SELECT id FROM student_profile WHERE user_id = $1", [req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "A profile already exists. Use PUT /api/profile to update it instead.",
      });
    }

    const { rows } = await db.query(
      `INSERT INTO student_profile (user_id, name, degree, department, semester)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, degree, department, semester, created_at, updated_at`,
      [req.userId, name.trim(), degree.trim(), department.trim(), semesterNum]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createProfile error:", err);
    return res.status(500).json({ error: "Something went wrong while creating the profile." });
  }
}

// PUT /api/profile
// Updates the logged-in user's profile row. Fails with 404 if none exists yet.
async function updateProfile(req, res) {
  const { errors, semesterNum } = validateProfileInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { name, degree, department } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE student_profile
       SET name = $1, degree = $2, department = $3, semester = $4, updated_at = now()
       WHERE user_id = $5
       RETURNING id, name, degree, department, semester, created_at, updated_at`,
      [name.trim(), degree.trim(), department.trim(), semesterNum, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No profile exists yet. Use POST /api/profile to create one." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ error: "Something went wrong while updating the profile." });
  }
}

// DELETE /api/profile
// Deletes the logged-in user's profile row, if it exists.
async function deleteProfile(req, res) {
  try {
    const { rowCount } = await db.query("DELETE FROM student_profile WHERE user_id = $1", [req.userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "No profile exists to delete." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteProfile error:", err);
    return res.status(500).json({ error: "Something went wrong while deleting the profile." });
  }
}

module.exports = { getProfile, createProfile, updateProfile, deleteProfile };
