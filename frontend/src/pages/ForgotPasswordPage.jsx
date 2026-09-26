// ForgotPasswordPage.jsx
import { useState } from "react";
import { supabase } from "../api/supabaseClient";

export default function ForgotPasswordPage({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send the reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p>If an account exists for <strong>{email}</strong>, we sent a password reset link to it.</p>
        <div className="card-actions">
          <button type="button" onClick={onSwitchToLogin}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Reset your password</h2>
      {error && <p className="form-error">{error}</p>}
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
      </label>
      <div className="card-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </button>
        <button type="button" onClick={onSwitchToLogin} disabled={submitting}>
          Back to login
        </button>
      </div>
    </form>
  );
}
