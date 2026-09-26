// auth.js
// Bridges a Supabase session (signup/login/email-link result) into our
// own httpOnly-cookie session, and talks to the small set of Express
// endpoints that manage that cookie session.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Call this immediately after any successful Supabase auth action
// (signUp, signInWithPassword, an email-link session, a password change)
// with the session object Supabase returned: { access_token, refresh_token }.
export async function establishSession(session) {
  const { data } = await api.post("/auth/session", {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return data.user;
}

export async function fetchCurrentUser() {
  try {
    const { data } = await api.get("/auth/me");
    return data.user;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return null; // not logged in — not an error state
    }
    throw err;
  }
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}
