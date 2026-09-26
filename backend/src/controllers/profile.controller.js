// profile.controller.js
// "Controller" = the function that runs when a specific route is hit.
// It reads the request, talks to the database, and sends back a response.
// It does NOT decide the URL or HTTP method — that's the router's job (see routes/profile.routes.js).
//
// As of Phase 2, this resource is basic identity only (name). Education
// (degree/discipline/institution/year/semester) lives in education_records
// — see education.controller.js.

const db = require("../db");

function validateProfileInput(body) {
  const errors = [];
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("name is required and must be a non-empty string");
  }

  return { errors };
}

// GET /api/profile
// Returns the logged-in user's profile row, or 404 if they haven't created one yet.
async function getProfile(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, name, created_at, updated_at FROM student_profile WHERE user_id = $1",
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
  const { errors } = validateProfileInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { name } = req.body;

  try {
    const existing = await db.query("SELECT id FROM student_profile WHERE user_id = $1", [req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "A profile already exists. Use PUT /api/profile to update it instead.",
      });
    }

    const { rows } = await db.query(
      `INSERT INTO student_profile (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at, updated_at`,
      [req.userId, name.trim()]
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
  const { errors } = validateProfileInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { name } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE student_profile
       SET name = $1, updated_at = now()
       WHERE user_id = $2
       RETURNING id, name, created_at, updated_at`,
      [name.trim(), req.userId]
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
