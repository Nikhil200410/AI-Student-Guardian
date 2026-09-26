// education.controller.js
// Manages education_records. A student can now have multiple records
// (e.g. Intermediate -> B.Tech, or Class 11 -> Class 12 -> Intermediate ->
// B.Tech -> Postgraduate) with at most one marked "current" at a time,
// enforced by a partial unique index in the database. This is not
// B.Tech-specific: education_level_id points at a small, extensible
// lookup table (education_levels) rather than assuming any one path.

const db = require("../db");

async function validateEducationLevel(educationLevelId) {
  const { rows } = await db.query("SELECT id FROM education_levels WHERE id = $1", [educationLevelId]);
  return rows.length > 0;
}

function validateEducationInput(body) {
  const errors = [];
  const { education_level_id, degree_type, discipline, institution, current_year, current_semester } = body;

  const levelIdNum = Number(education_level_id);
  if (!education_level_id || !Number.isInteger(levelIdNum)) {
    errors.push("education_level_id is required and must refer to a valid education level.");
  }
  if (!degree_type || typeof degree_type !== "string" || !degree_type.trim()) {
    errors.push("degree_type is required.");
  }
  // discipline is optional as of this design — not every level has one
  // (e.g. School, before a stream is chosen).
  if (discipline !== undefined && discipline !== null && typeof discipline !== "string") {
    errors.push("discipline must be a string.");
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

  return { errors, levelIdNum, yearNum, semesterNum };
}

const RECORD_COLUMNS =
  "id, education_level_id, degree_type, discipline, institution, current_year, current_semester, is_current, created_at, updated_at";

// GET /api/education/levels — read-only lookup list for the level dropdown.
async function listEducationLevels(req, res) {
  try {
    const { rows } = await db.query("SELECT id, name FROM education_levels ORDER BY id ASC");
    return res.json(rows);
  } catch (err) {
    console.error("listEducationLevels error:", err);
    return res.status(500).json({ error: "Could not load education levels." });
  }
}

// GET /api/education — full history, current record first.
async function listEducation(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT er.*, el.name AS education_level_name
       FROM education_records er
       JOIN education_levels el ON el.id = er.education_level_id
       WHERE er.user_id = $1
       ORDER BY er.is_current DESC, er.created_at DESC`,
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
      `SELECT er.*, el.name AS education_level_name
       FROM education_records er
       JOIN education_levels el ON el.id = er.education_level_id
       WHERE er.user_id = $1 AND er.is_current = true`,
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

// POST /api/education
// Creates a new education record. A student may have any number of
// records — this no longer rejects the request just because a current
// record already exists.
//   - If the new record's is_current is requested true (or this is the
//     student's very first record ever), any existing current record is
//     atomically un-marked first, inside a transaction, so the database
//     is never left with zero or two current records at once.
//   - Otherwise the new record is simply added as historical (is_current = false).
async function createEducation(req, res) {
  const { errors, levelIdNum, yearNum, semesterNum } = validateEducationInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { degree_type, discipline, institution } = req.body;
  const requestedCurrent = req.body.is_current === true;

  const client = await db.pool.connect();
  try {
    if (!(await validateEducationLevel(levelIdNum))) {
      client.release();
      return res.status(400).json({ error: "education_level_id does not refer to a known education level." });
    }

    await client.query("BEGIN");

    const existingCurrent = await client.query(
      "SELECT id FROM education_records WHERE user_id = $1 AND is_current = true",
      [req.userId]
    );
    const shouldBeCurrent = requestedCurrent || existingCurrent.rows.length === 0;

    if (shouldBeCurrent && existingCurrent.rows.length > 0) {
      await client.query(
        "UPDATE education_records SET is_current = false, updated_at = now() WHERE user_id = $1 AND is_current = true",
        [req.userId]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO education_records
         (user_id, education_level_id, degree_type, discipline, institution, current_year, current_semester, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${RECORD_COLUMNS}`,
      [
        req.userId,
        levelIdNum,
        degree_type.trim(),
        discipline ? discipline.trim() : null,
        institution ? institution.trim() : null,
        yearNum,
        semesterNum,
        shouldBeCurrent,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createEducation error:", err);
    return res.status(500).json({ error: "Could not create the education record." });
  } finally {
    client.release();
  }
}

// PUT /api/education/:id — edits a record's own fields. Does NOT change
// is_current — use POST /api/education/:id/set-current for that, so the
// two concerns (editing details vs. switching which one is current) stay
// separate and each stays simple.
async function updateEducation(req, res) {
  const { errors, levelIdNum, yearNum, semesterNum } = validateEducationInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  const { degree_type, discipline, institution } = req.body;
  const { id } = req.params;

  try {
    if (!(await validateEducationLevel(levelIdNum))) {
      return res.status(400).json({ error: "education_level_id does not refer to a known education level." });
    }

    const { rows } = await db.query(
      `UPDATE education_records
       SET education_level_id = $1, degree_type = $2, discipline = $3, institution = $4,
           current_year = $5, current_semester = $6, updated_at = now()
       WHERE id = $7 AND user_id = $8
       RETURNING ${RECORD_COLUMNS}`,
      [
        levelIdNum,
        degree_type.trim(),
        discipline ? discipline.trim() : null,
        institution ? institution.trim() : null,
        yearNum,
        semesterNum,
        id,
        req.userId,
      ]
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

// POST /api/education/:id/set-current
// Atomically makes this record the current one and un-marks whatever
// record (if any) was current before — never leaves zero or two current
// records, even under concurrent requests, because both updates happen
// inside one transaction against a row we've confirmed belongs to this user.
async function setCurrentEducation(req, res) {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const target = await client.query(
      "SELECT id FROM education_records WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [id, req.userId]
    );
    if (target.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Education record not found." });
    }

    await client.query(
      "UPDATE education_records SET is_current = false, updated_at = now() WHERE user_id = $1 AND is_current = true AND id != $2",
      [req.userId, id]
    );
    const { rows } = await client.query(
      `UPDATE education_records SET is_current = true, updated_at = now() WHERE id = $1 RETURNING ${RECORD_COLUMNS}`,
      [id]
    );

    await client.query("COMMIT");
    return res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("setCurrentEducation error:", err);
    return res.status(500).json({ error: "Could not update your current education." });
  } finally {
    client.release();
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

module.exports = {
  listEducationLevels,
  listEducation,
  getCurrentEducation,
  createEducation,
  updateEducation,
  setCurrentEducation,
  deleteEducation,
};
