// availability.controller.js
const db = require("../db");

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM, 24-hour

function validateSlotInput(body) {
  const errors = [];
  const { day_of_week, start_time, end_time } = body;

  if (!DAYS.includes(day_of_week)) {
    errors.push(`day_of_week must be one of: ${DAYS.join(", ")}`);
  }
  if (!TIME_REGEX.test(start_time || "")) {
    errors.push("start_time must be in HH:MM 24-hour format, e.g. 18:00");
  }
  if (!TIME_REGEX.test(end_time || "")) {
    errors.push("end_time must be in HH:MM 24-hour format, e.g. 20:00");
  }
  if (TIME_REGEX.test(start_time || "") && TIME_REGEX.test(end_time || "") && end_time <= start_time) {
    errors.push("end_time must be after start_time.");
  }

  return { errors };
}

// GET /api/availability
async function listAvailability(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, day_of_week, start_time, end_time, created_at
       FROM availability_slots WHERE user_id = $1
       ORDER BY array_position(ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], day_of_week), start_time`,
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listAvailability error:", err);
    return res.status(500).json({ error: "Could not load availability." });
  }
}

// POST /api/availability
async function createSlot(req, res) {
  const { errors } = validateSlotInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { day_of_week, start_time, end_time } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO availability_slots (user_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, day_of_week, start_time, end_time, created_at`,
      [req.userId, day_of_week, start_time, end_time]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createSlot error:", err);
    return res.status(500).json({ error: "Could not add the availability slot." });
  }
}

// DELETE /api/availability/:id
async function deleteSlot(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query(
      "DELETE FROM availability_slots WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Availability slot not found." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteSlot error:", err);
    return res.status(500).json({ error: "Could not delete the availability slot." });
  }
}

module.exports = { listAvailability, createSlot, deleteSlot };
