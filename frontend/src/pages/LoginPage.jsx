// LoginPage.jsx
import { useState } from "react";
import { supabase } from "../api/supabaseClient";
import { establishSession } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ onSwitchToSignup, onSwitchToForgot }) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const user = await establishSession(data.session);
      setUser(user);
    } catch (err) {
      setError(err.message || "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Log in</h2>
      {error && <p className="form-error">{error}</p>}
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
      </label>
      <label>
        Password
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <div className="card-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </div>
      <p className="twin-empty-hint">
        <button type="button" onClick={onSwitchToForgot}>
          Forgot password?
        </button>
      </p>
      <p className="twin-empty-hint">
        Don't have an account?{" "}
        <button type="button" onClick={onSwitchToSignup}>
          Sign up
        </button>
      </p>
    </form>
  );
}
