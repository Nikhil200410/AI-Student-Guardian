// GoalsSection.jsx
import { useEffect, useState } from "react";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "../../api/digitalTwin";

const EMPTY = { goal_type: "short_term", title: "", description: "", priority: "medium", status: "active", target_date: "" };

export default function GoalsSection() {
  const [goals, setGoals] = useState(undefined);
  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = adding, else goal id
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setGoals(await fetchGoals());
    } catch {
      setError("Could not load goals.");
      setGoals([]);
    }
  }

  function startEdit(goal) {
    setEditingId(goal.id);
    setValues({ ...goal, target_date: goal.target_date ? goal.target_date.slice(0, 10) : "" });
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
      if (editingId === "new") {
        await createGoal(values);
      } else {
        await updateGoal(editingId, values);
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save the goal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await deleteGoal(id);
      await load();
    } catch {
      setError("Could not delete the goal.");
    }
  }

  if (goals === undefined) return <p className="status">Loading...</p>;

  return (
    <div>
      <h2>Goals</h2>
      {error && <p className="form-error">{error}</p>}

      {editingId ? (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Type
            <select name="goal_type" value={values.goal_type} onChange={handleChange}>
              <option value="short_term">Short-term</option>
              <option value="long_term">Long-term</option>
            </select>
          </label>
          <label>
            Title
            <input name="title" value={values.title} onChange={handleChange} placeholder="e.g. Finish DSA course" />
          </label>
          <label>
            Description (optional)
            <input name="description" value={values.description || ""} onChange={handleChange} />
          </label>
          <label>
            Priority
            <select name="priority" value={values.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" value={values.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </label>
          <label>
            Target date (optional)
            <input name="target_date" type="date" value={values.target_date || ""} onChange={handleChange} />
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
        <button onClick={startNew}>+ Add goal</button>
      )}

      <div className="twin-list">
        {goals.map((g) => (
          <div className="card" key={g.id}>
            <h3>{g.title}</h3>
            <p>
              {g.goal_type === "short_term" ? "Short-term" : "Long-term"} · {g.priority} priority · {g.status}
              {g.target_date && ` · due ${g.target_date.slice(0, 10)}`}
            </p>
            {g.description && <p>{g.description}</p>}
            <div className="card-actions">
              <button onClick={() => startEdit(g)}>Edit</button>
              <button className="danger" onClick={() => handleDelete(g.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {goals.length === 0 && <p className="twin-empty-hint">No goals yet.</p>}
      </div>
    </div>
  );
}
