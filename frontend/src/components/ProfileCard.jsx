// ProfileCard.jsx
// Read-only display of the saved profile, with Edit / Delete actions.
// As of Phase 2, profile is basic identity only (name) — see
// EducationSection.jsx for degree/discipline/institution/year/semester.

export default function ProfileCard({ profile, onEdit, onDelete }) {
  return (
    <div className="card">
      <h2>{profile.name}</h2>
      <div className="card-actions">
        <button onClick={onEdit}>Edit</button>
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
