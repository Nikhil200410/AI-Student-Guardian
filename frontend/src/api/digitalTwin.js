// digitalTwin.js
// API calls for every Phase 2 resource, grouped by section. Same axios
// pattern as client.js/auth.js — withCredentials so the auth cookie is sent.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// --- Overview ---
export async function fetchOverview() {
  const { data } = await api.get("/digital-twin/overview");
  return data;
}

// --- Education ---
export async function fetchCurrentEducation() {
  try {
    const { data } = await api.get("/education/current");
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}
export async function createEducation(payload) {
  const { data } = await api.post("/education", payload);
  return data;
}
export async function updateEducation(id, payload) {
  const { data } = await api.put(`/education/${id}`, payload);
  return data;
}

// --- Goals ---
export async function fetchGoals() {
  const { data } = await api.get("/goals");
  return data;
}
export async function createGoal(payload) {
  const { data } = await api.post("/goals", payload);
  return data;
}
export async function updateGoal(id, payload) {
  const { data } = await api.put(`/goals/${id}`, payload);
  return data;
}
export async function deleteGoal(id) {
  await api.delete(`/goals/${id}`);
}

// --- Skill categories (read-only) ---
export async function fetchSkillCategories() {
  const { data } = await api.get("/skill-categories");
  return data;
}

// --- Skills + evidence ---
export async function fetchSkills() {
  const { data } = await api.get("/skills");
  return data;
}
export async function createSkill(payload) {
  const { data } = await api.post("/skills", payload);
  return data;
}
export async function updateSkill(id, payload) {
  const { data } = await api.put(`/skills/${id}`, payload);
  return data;
}
export async function deleteSkill(id) {
  await api.delete(`/skills/${id}`);
}
export async function fetchSkillEvidence(skillId) {
  const { data } = await api.get(`/skills/${skillId}/evidence`);
  return data;
}
export async function addSkillEvidence(skillId, payload) {
  const { data } = await api.post(`/skills/${skillId}/evidence`, payload);
  return data;
}
export async function deleteSkillEvidence(skillId, evidenceId) {
  await api.delete(`/skills/${skillId}/evidence/${evidenceId}`);
}

// --- Interests ---
export async function fetchInterests() {
  const { data } = await api.get("/interests");
  return data;
}
export async function createInterest(payload) {
  const { data } = await api.post("/interests", payload);
  return data;
}
export async function deleteInterest(id) {
  await api.delete(`/interests/${id}`);
}

// --- Preferences ---
export async function fetchPreferences() {
  try {
    const { data } = await api.get("/preferences");
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}
export async function createPreferences(payload) {
  const { data } = await api.post("/preferences", payload);
  return data;
}
export async function updatePreferences(payload) {
  const { data } = await api.put("/preferences", payload);
  return data;
}

// --- Availability ---
export async function fetchAvailability() {
  const { data } = await api.get("/availability");
  return data;
}
export async function createAvailabilitySlot(payload) {
  const { data } = await api.post("/availability", payload);
  return data;
}
export async function deleteAvailabilitySlot(id) {
  await api.delete(`/availability/${id}`);
}

// --- Hobbies & commitments ---
export async function fetchHobbies() {
  const { data } = await api.get("/hobbies");
  return data;
}
export async function createHobby(payload) {
  const { data } = await api.post("/hobbies", payload);
  return data;
}
export async function updateHobby(id, payload) {
  const { data } = await api.put(`/hobbies/${id}`, payload);
  return data;
}
export async function deleteHobby(id) {
  await api.delete(`/hobbies/${id}`);
}
