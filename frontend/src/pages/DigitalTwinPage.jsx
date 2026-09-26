// DigitalTwinPage.jsx
// Sidebar-based dashboard. Each section is its own component; this page
// just tracks which one is selected and renders it. Sections fetch their
// own data — no shared state needed between them for Phase 2.

import { useState } from "react";
import OverviewSection from "../components/digital-twin/OverviewSection";
import EducationSection from "../components/digital-twin/EducationSection";
import GoalsSection from "../components/digital-twin/GoalsSection";
import SkillsSection from "../components/digital-twin/SkillsSection";
import InterestsSection from "../components/digital-twin/InterestsSection";
import PreferencesSection from "../components/digital-twin/PreferencesSection";
import AvailabilitySection from "../components/digital-twin/AvailabilitySection";
import HobbiesSection from "../components/digital-twin/HobbiesSection";

const SECTIONS = [
  { id: "overview", label: "Overview", Component: OverviewSection },
  { id: "education", label: "Education", Component: EducationSection },
  { id: "goals", label: "Goals", Component: GoalsSection },
  { id: "skills", label: "Skills", Component: SkillsSection },
  { id: "interests", label: "Interests", Component: InterestsSection },
  { id: "preferences", label: "Preferences", Component: PreferencesSection },
  { id: "availability", label: "Availability", Component: AvailabilitySection },
  { id: "hobbies", label: "Hobbies & Commitments", Component: HobbiesSection },
];

export default function DigitalTwinPage() {
  const [activeId, setActiveId] = useState("overview");
  const active = SECTIONS.find((s) => s.id === activeId);
  const ActiveComponent = active.Component;

  return (
    <div className="twin-layout">
      <nav className="twin-sidebar">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`twin-sidebar-link ${s.id === activeId ? "active" : ""}`}
            onClick={() => setActiveId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="twin-content">
        <ActiveComponent onNavigate={setActiveId} />
      </div>
    </div>
  );
}
