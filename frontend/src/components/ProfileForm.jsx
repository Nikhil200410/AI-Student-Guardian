// ProfileForm.jsx
// Used both for creating a new profile and editing an existing one.
// As of Phase 2, profile is basic identity only — see EducationSection.jsx
// for degree/discipline/institution/year/semester.

import { useState } from "react";

const EMPTY = { name: "" };

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

    if (!values.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input name="name" value={values.name} onChange={handleChange} placeholder="e.g. Priya Sharma" />
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
