// OverviewSection.jsx
// Read-only summary pulled from GET /api/digital-twin/overview. Links let
// the student jump to a section to see/edit the full detail there — this
// section never shows or edits detailed records itself.

import { useEffect, useState } from "react";
import { fetchOverview } from "../../api/digitalTwin";

export default function OverviewSection({ onNavigate }) {
  const [overview, setOverview] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview()
      .then(setOverview)
      .catch(() => setError("Could not load your overview."));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (overview === undefined) return <p className="status">Loading overview...</p>;

  return (
    <div>
      <h2>Overview</h2>
      <div className="twin-overview-grid">
        <div className="card twin-summary-card" onClick={() => onNavigate("education")}>
          <h3>Education</h3>
          {overview.currentEducation ? (
            <p>
              {overview.currentEducation.degree_type} · {overview.currentEducation.discipline}
              {overview.currentEducation.current_semester && ` · Semester ${overview.currentEducation.current_semester}`}
            </p>
          ) : (
            <p className="twin-empty-hint">Not set yet — click to add.</p>
          )}
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("goals")}>
          <h3>Goals</h3>
          <p>
            {overview.goalCounts.active} active · {overview.goalCounts.completed} completed
          </p>
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("skills")}>
          <h3>Skills</h3>
          <p>
            {overview.skillCounts.claimed} claimed · {overview.skillCounts.demonstrated} demonstrated
          </p>
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("interests")}>
          <h3>Interests</h3>
          <p>{overview.interestCount} saved</p>
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("preferences")}>
          <h3>Preferences</h3>
          <p>{overview.preferencesConfigured ? "Configured" : "Not set yet — click to add."}</p>
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("availability")}>
          <h3>Availability</h3>
          <p>{overview.weeklyAvailabilityHoursFromSlots.toFixed(1)} hrs/week scheduled</p>
        </div>

        <div className="card twin-summary-card" onClick={() => onNavigate("hobbies")}>
          <h3>Hobbies & Commitments</h3>
          <p>{overview.hobbyCount} recorded</p>
        </div>
      </div>
    </div>
  );
}
