// preferenceOptions.js
// Single source of truth for the dropdown values student_preferences
// accepts. These must stay in sync with the CHECK constraints in
// schema_phase2.sql — if you add an option here, add a small migration to
// widen the matching CHECK constraint too (and vice versa).

const LEARNING_STYLES = ["visual", "hands_on", "reading", "mixed"];
const PROGRESSION_STYLES = ["gradual", "challenge_first"];
const STUDY_TIMES = ["morning", "afternoon", "evening", "night"];
const RECOMMENDATION_FREQUENCIES = ["daily", "weekly", "biweekly"];

module.exports = {
  LEARNING_STYLES,
  PROGRESSION_STYLES,
  STUDY_TIMES,
  RECOMMENDATION_FREQUENCIES,
};
