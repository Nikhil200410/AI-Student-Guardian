// goals.controller.js
const db = require("../db");

const GOAL_TYPES = ["short_term", "long_term"];
const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["active", "completed", "paused", "abandoned"];

function validateGoalInput(body, { partial = false } = {}) {
  const errors = [];
  const { goal_type, title, description, priority, status, target_date } = body;

  if (!partial || goal_type !== undefined) {
    if (!GOAL_TYPES.includes(goal_type)) {
      errors.push(`goal_type must be one of: ${GOAL_TYPES.join(", ")}`);
    }
  }
  if (!partial || title !== undefined) {
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.push("title is required.");
    }
  }
  if (priority !== undefined && priority !== null && !PRIORITIES.includes(priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }
  if (status !== undefined && status !== null && !STATUSES.includes(status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (target_date !== undefined && target_date !== null && target_date !== "" && isNaN(Date.parse(target_date))) {
    errors.push("target_date must be a valid date.");
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    errors.push("description must be a string.");
  }

  return { errors };
}

// GET /api/goals?type=short_term|long_term
async function listGoals(req, res) {
  const { type } = req.query;
  if (type && !GOAL_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${GOAL_TYPES.join(", ")}` });
  }
  try {
    const params = [req.userId];
    let query = `SELECT id, goal_type, title, description, priority, status, target_date, created_at, updated_at
                 FROM goals WHERE user_id = $1`;
    if (type) {
      params.push(type);
      query += ` AND goal_type = $2`;
    }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await db.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error("listGoals error:", err);
    return res.status(500).json({ error: "Could not load goals." });
  }
}

// POST /api/goals
async function createGoal(req, res) {
  const { errors } = validateGoalInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { goal_type, title, description, priority, status, target_date } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO goals (user_id, goal_type, title, description, priority, status, target_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, goal_type, title, description, priority, status, target_date, created_at, updated_at`,
      [
        req.userId,
        goal_type,
        title.trim(),
        description || null,
        priority || "medium",
        status || "active",
        target_date || null,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createGoal error:", err);
    return res.status(500).json({ error: "Could not create the goal." });
  }
}

// PUT /api/goals/:id
async function updateGoal(req, res) {
  const { errors } = validateGoalInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { id } = req.params;
  const { goal_type, title, description, priority, status, target_date } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE goals
       SET goal_type = $1, title = $2, description = $3, priority = $4, status = $5,
           target_date = $6, updated_at = now()
       WHERE id = $7 AND user_id = $8
       RETURNING id, goal_type, title, description, priority, status, target_date, created_at, updated_at`,
      [goal_type, title.trim(), description || null, priority || "medium", status || "active", target_date || null, id, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Goal not found." });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("updateGoal error:", err);
    return res.status(500).json({ error: "Could not update the goal." });
  }
}

// DELETE /api/goals/:id
async function deleteGoal(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query("DELETE FROM goals WHERE id = $1 AND user_id = $2", [id, req.userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Goal not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteGoal error:", err);
    return res.status(500).json({ error: "Could not delete the goal." });
  }
}

module.exports = { listGoals, createGoal, updateGoal, deleteGoal };
