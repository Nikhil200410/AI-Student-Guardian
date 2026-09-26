// client.js
// One place that knows how to talk to the backend. Every component imports
// functions from here instead of calling axios directly — this way, if the
// API changes shape later, we only fix it in one file.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Phase 1: profile routes now require the auth cookie
});

export async function fetchHealth() {
  const { data } = await api.get("/health");
  return data;
}

export async function fetchProfile() {
  // Returns null if no profile exists yet (404), instead of throwing,
  // so the UI can show a "create your profile" state.
  try {
    const { data } = await api.get("/profile");
    return data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function createProfile(profile) {
  const { data } = await api.post("/profile", profile);
  return data;
}

export async function updateProfile(profile) {
  const { data } = await api.put("/profile", profile);
  return data;
}

export async function deleteProfile() {
  await api.delete("/profile");
}
