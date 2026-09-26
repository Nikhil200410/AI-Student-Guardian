// ChangePasswordPage.jsx
// Implements real reauthentication, not a fake frontend check: the
// current password is verified by actually signing in with it against
// Supabase, BEFORE the new password is ever set. See the design note in
// chat for why this is the only way to genuinely satisfy "current
// password + new password" using Supabase Auth's actual API surface.

import { useState } from "react";
import { supabase } from "../api/supabaseClient";
import { establishSession } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: prove the current password is correct by actually
      // authenticating with it — this is real verification against
      // Supabase, not a client-side comparison of anything we store.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        setError("Current password is incorrect.");
        setSubmitting(false);
        return;
      }

      // Step 2: only now, with current password proven, set the new one.
      const { data, error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Step 3: refresh our cookie session with the tokens from this
      // freshly re-established session.
      const refreshedUser = await establishSession(data.session);
      setUser(refreshedUser);

      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not change your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Change password</h2>
        {error && <p className="form-error">{error}</p>}
        {success && <p>Password changed successfully.</p>}
        <label>
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </label>
        <div className="card-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Changing..." : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
