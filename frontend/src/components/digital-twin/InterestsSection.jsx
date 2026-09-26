// InterestsSection.jsx
import { useEffect, useState } from "react";
import { fetchInterests, createInterest, deleteInterest } from "../../api/digitalTwin";

export default function InterestsSection() {
  const [interests, setInterests] = useState(undefined);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setInterests(await fetchInterests());
    } catch {
      setError("Could not load interests.");
      setInterests([]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await createInterest({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add the interest.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteInterest(id);
      await load();
    } catch {
      setError("Could not remove the interest.");
    }
  }

  if (interests === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Interests</h2>
      {error && <p className="form-error">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Add an interest
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Competitive Programming, or your own"
          />
        </label>
        <div className="card-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      <div className="twin-tag-list">
        {interests.map((i) => (
          <span key={i.id} className="twin-tag">
            {i.name}
            <button className="twin-tag-remove" onClick={() => handleDelete(i.id)} aria-label={`Remove ${i.name}`}>
              ×
            </button>
          </span>
        ))}
        {interests.length === 0 && <p className="twin-empty-hint">No interests added yet.</p>}
      </div>
    </div>
  );
}
