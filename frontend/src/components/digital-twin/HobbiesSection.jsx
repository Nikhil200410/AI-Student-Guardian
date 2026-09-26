// HobbiesSection.jsx
import { useEffect, useState } from "react";
import { fetchHobbies, createHobby, updateHobby, deleteHobby } from "../../api/digitalTwin";

const EMPTY = { name: "", description: "", time_commitment: "" };

export default function HobbiesSection() {
  const [items, setItems] = useState(undefined);
  const [editingId, setEditingId] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setItems(await fetchHobbies());
    } catch {
      setError("Could not load hobbies & commitments.");
      setItems([]);
    }
  }

  function startNew() {
    setEditingId("new");
    setValues(EMPTY);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setValues(item);
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
        await createHobby(values);
      } else {
        await updateHobby(editingId, values);
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteHobby(id);
      await load();
    } catch {
      setError("Could not delete this entry.");
    }
  }

  if (items === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Hobbies & Personal Commitments</h2>
      <p className="twin-empty-hint">
        Informational only for now — nothing here is used for planning or recommendations yet.
      </p>
      {error && <p className="form-error">{error}</p>}

      {editingId ? (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" value={values.name} onChange={handleChange} placeholder="e.g. Football, Part-time job" />
          </label>
          <label>
            Description (optional)
            <input name="description" value={values.description || ""} onChange={handleChange} />
          </label>
          <label>
            Approximate time commitment (optional)
            <input
              name="time_commitment"
              value={values.time_commitment || ""}
              onChange={handleChange}
              placeholder="e.g. 3 hrs/week"
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
        <button onClick={startNew}>+ Add hobby / commitment</button>
      )}

      <div className="twin-list">
        {items.map((h) => (
          <div className="card" key={h.id}>
            <h3>{h.name}</h3>
            {h.time_commitment && <p>{h.time_commitment}</p>}
            {h.description && <p>{h.description}</p>}
            <div className="card-actions">
              <button onClick={() => startEdit(h)}>Edit</button>
              <button className="danger" onClick={() => handleDelete(h.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="twin-empty-hint">Nothing added yet.</p>}
      </div>
    </div>
  );
}
