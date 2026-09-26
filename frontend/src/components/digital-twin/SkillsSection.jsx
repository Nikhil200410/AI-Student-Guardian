// SkillsSection.jsx
// Skills list, add/edit/delete, plus an expandable evidence panel per skill.
// Trying to set status to "demonstrated" without evidence is rejected by
// the backend — this component just surfaces that error, it doesn't
// duplicate the rule client-side (single source of truth stays the server).

import { useEffect, useState } from "react";
import {
  fetchSkills,
  fetchSkillCategories,
  createSkill,
  updateSkill,
  deleteSkill,
  fetchSkillEvidence,
  addSkillEvidence,
  deleteSkillEvidence,
} from "../../api/digitalTwin";

const EMPTY = { name: "", category_id: "", custom_category_label: "" };
const EVIDENCE_EMPTY = { evidence_type: "project", description: "", link: "" };

export default function SkillsSection() {
  const [skills, setSkills] = useState(undefined);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSkillId, setExpandedSkillId] = useState(null);
  const [evidenceBySkill, setEvidenceBySkill] = useState({});
  const [evidenceForm, setEvidenceForm] = useState(EVIDENCE_EMPTY);

  useEffect(() => {
    load();
    fetchSkillCategories().then(setCategories).catch(() => {});
  }, []);

  async function load() {
    try {
      setSkills(await fetchSkills());
    } catch {
      setError("Could not load skills.");
      setSkills([]);
    }
  }

  function startNew() {
    setEditingId("new");
    setValues(EMPTY);
  }

  function handleChange(e) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createSkill(values);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add the skill.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this skill and all its evidence?")) return;
    try {
      await deleteSkill(id);
      await load();
    } catch {
      setError("Could not delete the skill.");
    }
  }

  async function toggleStatus(skill) {
    setError(null);
    const newStatus = skill.status === "claimed" ? "demonstrated" : "claimed";
    try {
      await updateSkill(skill.id, { status: newStatus });
      await load();
    } catch (err) {
      // This is where the "needs evidence first" rejection surfaces.
      setError(err.response?.data?.error || "Could not update skill status.");
    }
  }

  async function toggleEvidence(skillId) {
    if (expandedSkillId === skillId) {
      setExpandedSkillId(null);
      return;
    }
    setExpandedSkillId(skillId);
    if (!evidenceBySkill[skillId]) {
      try {
        const evidence = await fetchSkillEvidence(skillId);
        setEvidenceBySkill((prev) => ({ ...prev, [skillId]: evidence }));
      } catch {
        setError("Could not load evidence for this skill.");
      }
    }
  }

  async function handleAddEvidence(e, skillId) {
    e.preventDefault();
    setError(null);
    try {
      await addSkillEvidence(skillId, evidenceForm);
      const evidence = await fetchSkillEvidence(skillId);
      setEvidenceBySkill((prev) => ({ ...prev, [skillId]: evidence }));
      setEvidenceForm(EVIDENCE_EMPTY);
    } catch (err) {
      setError(err.response?.data?.error || "Could not add evidence.");
    }
  }

  async function handleDeleteEvidence(skillId, evidenceId) {
    try {
      await deleteSkillEvidence(skillId, evidenceId);
      const evidence = await fetchSkillEvidence(skillId);
      setEvidenceBySkill((prev) => ({ ...prev, [skillId]: evidence }));
    } catch {
      setError("Could not delete evidence.");
    }
  }

  if (skills === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Skills</h2>
      {error && <p className="form-error">{error}</p>}

      {editingId === "new" ? (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Skill name
            <input name="name" value={values.name} onChange={handleChange} placeholder="e.g. React" />
          </label>
          <label>
            Category
            <select name="category_id" value={values.category_id} onChange={handleChange}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {categories.find((c) => String(c.id) === String(values.category_id))?.name === "Other" && (
            <label>
              Describe the category
              <input name="custom_category_label" value={values.custom_category_label} onChange={handleChange} />
            </label>
          )}
          <div className="card-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add skill"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={startNew}>+ Add skill</button>
      )}

      <div className="twin-list">
        {skills.map((s) => (
          <div className="card" key={s.id}>
            <h3>
              {s.name}{" "}
              <span className={`badge badge-${s.status === "demonstrated" ? "ok" : "checking"}`}>{s.status}</span>
            </h3>
            <p>{s.category_name}{s.custom_category_label ? ` (${s.custom_category_label})` : ""}</p>
            <div className="card-actions">
              <button onClick={() => toggleStatus(s)}>
                {s.status === "claimed" ? "Mark demonstrated" : "Revert to claimed"}
              </button>
              <button onClick={() => toggleEvidence(s.id)}>
                {expandedSkillId === s.id ? "Hide evidence" : "View evidence"}
              </button>
              <button className="danger" onClick={() => handleDelete(s.id)}>
                Delete
              </button>
            </div>

            {expandedSkillId === s.id && (
              <div className="twin-evidence-panel">
                {(evidenceBySkill[s.id] || []).map((ev) => (
                  <div key={ev.id} className="twin-evidence-item">
                    <span>
                      <strong>{ev.evidence_type}</strong>: {ev.description}
                      {ev.link && (
                        <>
                          {" "}
                          — <a href={ev.link} target="_blank" rel="noreferrer">link</a>
                        </>
                      )}
                    </span>
                    <button className="danger" onClick={() => handleDeleteEvidence(s.id, ev.id)}>
                      Remove
                    </button>
                  </div>
                ))}
                {(evidenceBySkill[s.id] || []).length === 0 && (
                  <p className="twin-empty-hint">No evidence added yet.</p>
                )}

                <form onSubmit={(e) => handleAddEvidence(e, s.id)} className="twin-evidence-form">
                  <select
                    value={evidenceForm.evidence_type}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, evidence_type: e.target.value }))}
                  >
                    <option value="project">Project</option>
                    <option value="certificate">Certificate</option>
                    <option value="coding_problem">Coding problem</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    placeholder="Description"
                    value={evidenceForm.description}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <input
                    placeholder="Link (optional)"
                    value={evidenceForm.link}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, link: e.target.value }))}
                  />
                  <button type="submit">Add evidence</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {skills.length === 0 && <p className="twin-empty-hint">No skills added yet.</p>}
      </div>
    </div>
  );
}
