// ResetPasswordPage.jsx
// Where Supabase redirects the browser after the user clicks the
// PASSWORD RECOVERY link. Handled as a SEPARATE flow from AuthCallback —
// per instruction, recovery and verification callbacks are not assumed to
// behave identically. This exchanges the code for a recovery session,
// then shows a "set new password" form rather than immediately
// redirecting, since the user still needs to choose a new password before
// the flow is actually complete.
//
// Same PKCE-vs-implicit-flow caveat as AuthCallback.jsx applies here —
// verify against your actual Supabase project before relying on this.

import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { establishSession } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordPage() {
  const { setUser } = useAuth();
  const [status, setStatus] = useState("exchanging"); // exchanging | ready | error | done
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoverySession, setRecoverySession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchangeError) throw exchangeError;
        setRecoverySession(data.session);
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setError(err.message || "This reset link is invalid or has expired.");
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const user = await establishSession(data.session || recoverySession);
      setUser(user);
      setStatus("done");
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Could not set your new password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "exchanging") {
    return (
      <div className="page">
        <p className="status">Verifying your reset link...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page">
        <div className="card">
          <h2>Reset link invalid</h2>
          <p className="form-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Set a new password</h2>
        {error && <p className="form-error">{error}</p>}
        <label>
          New password
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
            {submitting ? "Saving..." : "Set new password"}
          </button>
        </div>
      </form>
    </div>
  );
}
