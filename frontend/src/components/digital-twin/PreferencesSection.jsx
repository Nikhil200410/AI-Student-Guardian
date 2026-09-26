// PreferencesSection.jsx
import { useEffect, useState } from "react";
import { fetchPreferences, createPreferences, updatePreferences } from "../../api/digitalTwin";

const EMPTY = {
  learning_style: "",
  progression_style: "",
  preferred_study_time: "",
  recommendation_frequency: "",
  weekly_available_hours: "",
};

export default function PreferencesSection() {
  const [preferences, setPreferences] = useState(undefined);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await fetchPreferences();
      setPreferences(data);
      if (data) setValues({ ...EMPTY, ...data });
    } catch {
      setError("Could not load preferences.");
      setPreferences(null);
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
      const saved = preferences ? await updatePreferences(values) : await createPreferences(values);
      setPreferences(saved);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save preferences.");
    } finally {
      setSubmitting(false);
    }
  }

  if (preferences === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Preferences</h2>
      {error && <p className="form-error">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Learning style
          <select name="learning_style" value={values.learning_style || ""} onChange={handleChange}>
            <option value="">Not set</option>
            <option value="visual">Visual</option>
            <option value="hands_on">Hands-on</option>
            <option value="reading">Reading</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label>
          Progression style
          <select name="progression_style" value={values.progression_style || ""} onChange={handleChange}>
            <option value="">Not set</option>
            <option value="gradual">Gradual</option>
            <option value="challenge_first">Challenge-first</option>
          </select>
        </label>
        <label>
          Preferred study time
          <select name="preferred_study_time" value={values.preferred_study_time || ""} onChange={handleChange}>
            <option value="">Not set</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label>
          Recommendation frequency
          <select name="recommendation_frequency" value={values.recommendation_frequency || ""} onChange={handleChange}>
            <option value="">Not set</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
          </select>
        </label>
        <label>
          Weekly available hours (optional, general estimate)
          <input
            name="weekly_available_hours"
            type="number"
            min="0"
            value={values.weekly_available_hours || ""}
            onChange={handleChange}
          />
        </label>
        <div className="card-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
