// AuthContext.jsx
// Holds "who is logged in" — checked via our own cookie session
// (GET /api/auth/me), not by asking Supabase directly, since Supabase's
// tokens never live in the browser outside of our httpOnly cookies.

import { createContext, useContext, useEffect, useState } from "react";
import { fetchCurrentUser, logoutRequest } from "../api/auth";
import { supabase } from "../api/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    // Both matter: this ends the Supabase-side session, and clears our
    // own cookies. Neither alone is enough.
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if this fails (e.g. offline), still clear our own cookies below.
    }
    await logoutRequest();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
