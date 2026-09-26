// ProfileCard.jsx
// Read-only display of the saved profile, with Edit / Delete actions.
// It doesn't know HOW to save or delete — it just calls the functions
// passed in as props (onEdit, onDelete). This keeps it reusable and simple.

export default function ProfileCard({ profile, onEdit, onDelete }) {
  return (
    <div className="card">
      <h2>{profile.name}</h2>
      <dl className="card-fields">
        <dt>Degree</dt>
        <dd>{profile.degree}</dd>

        <dt>Department</dt>
        <dd>{profile.department}</dd>

        <dt>Semester</dt>
        <dd>{profile.semester}</dd>
      </dl>
      <div className="card-actions">
        <button onClick={onEdit}>Edit</button>
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
