// LoginPage.jsx
// Two steps: (1) enter email, request a code; (2) enter the code, verify it.
// On success, sets the user in AuthContext — App.jsx then swaps this screen
// out for ProfilePage automatically.

import { useState } from "react";
import { requestOtp, verifyOtp } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { setUser } = useAuth();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestOtp(email.trim());
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.error || "Could not send the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await verifyOtp(email.trim(), code.trim());
      setUser(user);
    } catch (err) {
      setError(err.response?.data?.error || "Could not verify the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Sign in</h2>

        {error && <p className="form-error">{error}</p>}

        {step === "email" ? (
          <form onSubmit={handleRequestOtp}>
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
              />
            </label>
            <div className="card-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send code"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p>We sent a 6-digit code to <strong>{email}</strong>.</p>
            <label>
              Code
              <input
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
              />
            </label>
            <div className="card-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Verifying..." : "Verify & sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                disabled={submitting}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
