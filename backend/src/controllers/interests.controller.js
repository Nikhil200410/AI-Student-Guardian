// interests.controller.js
const db = require("../db");

// GET /api/interests
async function listInterests(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, name, created_at FROM interests WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listInterests error:", err);
    return res.status(500).json({ error: "Could not load interests." });
  }
}

// POST /api/interests
async function createInterest(req, res) {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required." });
  }
  try {
    const { rows } = await db.query(
      "INSERT INTO interests (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at",
      [req.userId, name.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "You already have this interest." });
    }
    console.error("createInterest error:", err);
    return res.status(500).json({ error: "Could not add the interest." });
  }
}

// DELETE /api/interests/:id
async function deleteInterest(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query("DELETE FROM interests WHERE id = $1 AND user_id = $2", [id, req.userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Interest not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteInterest error:", err);
    return res.status(500).json({ error: "Could not delete the interest." });
  }
}

module.exports = { listInterests, createInterest, deleteInterest };
