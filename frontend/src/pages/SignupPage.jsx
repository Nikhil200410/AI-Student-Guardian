// SignupPage.jsx
import { useState } from "react";
import { supabase } from "../api/supabaseClient";
import { establishSession } from "../api/auth";

export default function SignupPage({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is required (the default), Supabase returns
      // a user but no active session yet — nothing to hand off until they
      // click the emailed link and land on /auth/callback.
      if (data.session) {
        // Some Supabase configs skip confirmation — handle that too.
        await establishSession(data.session);
        window.location.href = "/";
        return;
      }

      setDone(true);
    } catch (err) {
      setError(err.message || "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p>We sent a confirmation link to <strong>{email}</strong>. Click it to finish creating your account.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Create your account</h2>
      {error && <p className="form-error">{error}</p>}
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      <div className="card-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </div>
      <p className="twin-empty-hint">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </form>
  );
}
