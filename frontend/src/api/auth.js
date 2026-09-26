// auth.js
// Auth-related API calls, kept separate from client.js's profile calls.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // send/receive the httpOnly cookie
});

export async function requestOtp(email) {
  const { data } = await api.post("/auth/request-otp", { email });
  return data;
}

export async function verifyOtp(email, code) {
  const { data } = await api.post("/auth/verify-otp", { email, code });
  return data.user;
}

export async function logoutRequest() {
  await api.post("/auth/logout");
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
