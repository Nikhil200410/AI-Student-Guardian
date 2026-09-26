// AuthCallback.jsx
// Where Supabase redirects the browser after the user clicks the email
// CONFIRMATION link (signup verification). Exchanges the code in the URL
// for a session, then hands that session to our cookie bridge.
//
// IMPORTANT — flagged per instruction: this assumes Supabase's PKCE flow
// (a `?code=` query param), which is the current supabase-js v2 default.
// If your Supabase project is configured for the older implicit flow
// (tokens in the URL hash fragment instead), this exchange call will fail
// and the flow needs adjusting — verify which one your project actually
// sends by checking the real URL Supabase redirects to. Do not assume
// this works without testing it against your project.

import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { establishSession } from "../api/auth";

export default function AuthCallback() {
  const [status, setStatus] = useState("working"); // "working" | "error"
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchangeError) throw exchangeError;
        await establishSession(data.session);
        window.location.href = "/";
      } catch (err) {
        setStatus("error");
        setError(err.message || "Could not verify your email link.");
      }
    })();
  }, []);

  if (status === "error") {
    return (
      <div className="page">
        <div className="card">
          <h2>Verification failed</h2>
          <p className="form-error">{error}</p>
          <p>The link may have expired. Try signing up again or logging in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="status">Verifying your email...</p>
    </div>
  );
}
