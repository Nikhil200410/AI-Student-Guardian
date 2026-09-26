// EducationSection.jsx
// Shows a student's full education history, not just one record — e.g.
// Intermediate (completed) -> B.Tech (current) -> Postgraduate (added
// later). Exactly one record can be "current" at a time; switching which
// one is current is a separate action from editing a record's details.

import { useEffect, useState } from "react";
import {
  fetchEducationLevels,
  fetchEducationRecords,
  createEducation,
  updateEducation,
  setCurrentEducation,
  deleteEducation,
} from "../../api/digitalTwin";

const EMPTY = {
  education_level_id: "",
  degree_type: "",
  discipline: "",
  institution: "",
  current_year: "",
  current_semester: "",
};

export default function EducationSection() {
  const [records, setRecords] = useState(undefined);
  const [levels, setLevels] = useState([]);
  const [editingId, setEditingId] = useState(null); // null | "new" | record id
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
    fetchEducationLevels().then(setLevels).catch(() => {});
  }, []);

  async function load() {
    try {
      setRecords(await fetchEducationRecords());
    } catch {
      setError("Could not load your education records.");
      setRecords([]);
    }
  }

  function startNew() {
    setEditingId("new");
    setValues(EMPTY);
  }

  function startEdit(record) {
    setEditingId(record.id);
    setValues({
      education_level_id: record.education_level_id,
      degree_type: record.degree_type,
      discipline: record.discipline || "",
      institution: record.institution || "",
      current_year: record.current_year || "",
      current_semester: record.current_semester || "",
    });
  }

  function handleChange(e) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (editingId === "new") {
        await createEducation(values);
      } else {
        await updateEducation(editingId, values);
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save this education record.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetCurrent(id) {
    setError(null);
    try {
      await setCurrentEducation(id);
      await load();
    } catch {
      setError("Could not update your current education.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this education record?")) return;
    try {
      await deleteEducation(id);
      await load();
    } catch {
      setError("Could not delete this record.");
    }
  }

  if (records === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Education</h2>
      {error && <p className="form-error">{error}</p>}

      {editingId ? (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Education level
            <select name="education_level_id" value={values.education_level_id} onChange={handleChange}>
              <option value="">Select a level</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Degree / class name
            <input
              name="degree_type"
              value={values.degree_type}
              onChange={handleChange}
              placeholder="e.g. Class 11, Intermediate, B.Tech, M.Tech"
            />
          </label>
          <label>
            Discipline / stream (optional)
            <input
              name="discipline"
              value={values.discipline}
              onChange={handleChange}
              placeholder="e.g. MPC, Computer Science and Engineering"
            />
          </label>
          <label>
            Institution (optional)
            <input name="institution" value={values.institution} onChange={handleChange} />
          </label>
          <label>
            Current year (optional)
            <input name="current_year" type="number" min="1" max="10" value={values.current_year} onChange={handleChange} />
          </label>
          <label>
            Current semester (optional)
            <input
              name="current_semester"
              type="number"
              min="1"
              max="12"
              value={values.current_semester}
              onChange={handleChange}
            />
          </label>
          <div className="card-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={startNew}>+ Add education record</button>
      )}

      <div className="twin-list">
        {records.map((r) => (
          <div className="card" key={r.id}>
            <h3>
              {r.degree_type}
              {r.is_current && <span className="badge badge-ok"> Current</span>}
            </h3>
            <p>
              {r.education_level_name}
              {r.discipline && ` · ${r.discipline}`}
              {r.institution && ` · ${r.institution}`}
            </p>
            {(r.current_year || r.current_semester) && (
              <p>
                {r.current_year ? `Year ${r.current_year}` : ""}
                {r.current_year && r.current_semester ? " · " : ""}
                {r.current_semester ? `Semester ${r.current_semester}` : ""}
              </p>
            )}
            <div className="card-actions">
              <button onClick={() => startEdit(r)}>Edit</button>
              {!r.is_current && <button onClick={() => handleSetCurrent(r.id)}>Set as current</button>}
              <button className="danger" onClick={() => handleDelete(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="twin-empty-hint">No education records yet.</p>}
      </div>
    </div>
  );
}
