// AvailabilitySection.jsx
import { useEffect, useState } from "react";
import { fetchAvailability, createAvailabilitySlot, deleteAvailabilitySlot } from "../../api/digitalTwin";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const EMPTY = { day_of_week: "monday", start_time: "18:00", end_time: "20:00" };

export default function AvailabilitySection() {
  const [slots, setSlots] = useState(undefined);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setSlots(await fetchAvailability());
    } catch {
      setError("Could not load availability.");
      setSlots([]);
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
      await createAvailabilitySlot(values);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add the slot.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAvailabilitySlot(id);
      await load();
    } catch {
      setError("Could not remove the slot.");
    }
  }

  if (slots === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Availability</h2>
      {error && <p className="form-error">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Day
          <select name="day_of_week" value={values.day_of_week} onChange={handleChange}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start time
          <input name="start_time" type="time" value={values.start_time} onChange={handleChange} />
        </label>
        <label>
          End time
          <input name="end_time" type="time" value={values.end_time} onChange={handleChange} />
        </label>
        <div className="card-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add slot"}
          </button>
        </div>
      </form>

      <div className="twin-list">
        {slots.map((s) => (
          <div className="card twin-slot-row" key={s.id}>
            <span>
              {s.day_of_week.charAt(0).toUpperCase() + s.day_of_week.slice(1)}: {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
            </span>
            <button className="danger" onClick={() => handleDelete(s.id)}>
              Remove
            </button>
          </div>
        ))}
        {slots.length === 0 && <p className="twin-empty-hint">No availability slots added yet.</p>}
      </div>
    </div>
  );
}
