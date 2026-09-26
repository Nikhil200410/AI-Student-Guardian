// EducationSection.jsx
import { useEffect, useState } from "react";
import { fetchCurrentEducation, createEducation, updateEducation } from "../../api/digitalTwin";

const EMPTY = { degree_type: "", discipline: "", institution: "", current_year: "", current_semester: "" };

export default function EducationSection() {
  const [education, setEducation] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await fetchCurrentEducation();
      setEducation(data);
      if (data) setValues(data);
    } catch (err) {
      setError("Could not load your education record.");
      setEducation(null);
    }
  }

  function handleChange(e) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const saved = education ? await updateEducation(education.id, values) : await createEducation(values);
      setEducation(saved);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save your education record.");
    } finally {
      setSubmitting(false);
    }
  }

  if (education === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Education</h2>
      {error && <p className="form-error">{error}</p>}

      {editing || !education ? (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Degree type
            <input name="degree_type" value={values.degree_type} onChange={handleChange} placeholder="e.g. B.Tech" />
          </label>
          <label>
            Discipline / Department
            <input name="discipline" value={values.discipline} onChange={handleChange} placeholder="e.g. Computer Science" />
          </label>
          <label>
            Institution (optional)
            <input name="institution" value={values.institution || ""} onChange={handleChange} placeholder="e.g. IIT Hyderabad" />
          </label>
          <label>
            Current year (optional)
            <input
              name="current_year"
              type="number"
              min="1"
              max="10"
              value={values.current_year || ""}
              onChange={handleChange}
            />
          </label>
          <label>
            Current semester (optional)
            <input
              name="current_semester"
              type="number"
              min="1"
              max="12"
              value={values.current_semester || ""}
              onChange={handleChange}
            />
          </label>
          <div className="card-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
            {education && (
              <button type="button" onClick={() => setEditing(false)} disabled={submitting}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="card">
          <h3>{education.degree_type} · {education.discipline}</h3>
          {education.institution && <p>{education.institution}</p>}
          <p>
            {education.current_year ? `Year ${education.current_year}` : "Year not set"}
            {" · "}
            {education.current_semester ? `Semester ${education.current_semester}` : "Semester not set"}
          </p>
          <div className="card-actions">
            <button onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      )}
    </div>
  );
}
