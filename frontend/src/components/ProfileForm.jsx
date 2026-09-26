// ProfileForm.jsx
// Used both for creating a new profile and editing an existing one.
// It keeps its own local draft state (useState) while the user types,
// and only calls onSubmit once they hit Save.

import { useState } from "react";

const EMPTY = { name: "", degree: "", department: "", semester: "" };

export default function ProfileForm({ initialValues, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(initialValues || EMPTY);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim() || !values.degree.trim() || !values.department.trim()) {
      setError("Please fill in name, degree, and department.");
      return;
    }
    const semesterNum = Number(values.semester);
    if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 12) {
      setError("Semester must be a whole number between 1 and 12.");
      return;
    }

    onSubmit({ ...values, semester: semesterNum });
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input name="name" value={values.name} onChange={handleChange} placeholder="e.g. Priya Sharma" />
      </label>

      <label>
        Degree
        <input name="degree" value={values.degree} onChange={handleChange} placeholder="e.g. B.Tech" />
      </label>

      <label>
        Department
        <input
          name="department"
          value={values.department}
          onChange={handleChange}
          placeholder="e.g. Computer Science"
        />
      </label>

      <label>
        Semester
        <input
          name="semester"
          type="number"
          min="1"
          max="12"
          value={values.semester}
          onChange={handleChange}
          placeholder="e.g. 5"
        />
      </label>

      <div className="card-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
