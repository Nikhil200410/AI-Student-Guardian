// hobbies.controller.js
const db = require("../db");

function validateHobbyInput(body) {
  const errors = [];
  const { name, description, time_commitment } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("name is required.");
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    errors.push("description must be a string.");
  }
  if (time_commitment !== undefined && time_commitment !== null && typeof time_commitment !== "string") {
    errors.push("time_commitment must be a string.");
  }

  return { errors };
}

// GET /api/hobbies
async function listHobbies(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, name, description, time_commitment, created_at, updated_at FROM hobbies_commitments WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listHobbies error:", err);
    return res.status(500).json({ error: "Could not load hobbies & commitments." });
  }
}

// POST /api/hobbies
async function createHobby(req, res) {
  const { errors } = validateHobbyInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { name, description, time_commitment } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO hobbies_commitments (user_id, name, description, time_commitment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, time_commitment, created_at, updated_at`,
      [req.userId, name.trim(), description || null, time_commitment || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createHobby error:", err);
    return res.status(500).json({ error: "Could not add this entry." });
  }
}

// PUT /api/hobbies/:id
async function updateHobby(req, res) {
  const { errors } = validateHobbyInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { id } = req.params;
  const { name, description, time_commitment } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE hobbies_commitments
       SET name = $1, description = $2, time_commitment = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, description, time_commitment, created_at, updated_at`,
      [name.trim(), description || null, time_commitment || null, id, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entry not found." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("updateHobby error:", err);
    return res.status(500).json({ error: "Could not update this entry." });
  }
}

// DELETE /api/hobbies/:id
async function deleteHobby(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query(
      "DELETE FROM hobbies_commitments WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Entry not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteHobby error:", err);
    return res.status(500).json({ error: "Could not delete this entry." });
  }
}

module.exports = { listHobbies, createHobby, updateHobby, deleteHobby };
