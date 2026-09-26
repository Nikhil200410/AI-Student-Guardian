// AuthGate.jsx
// Shown when the user is logged out. Manages which of Login/Signup/Forgot
// Password is visible — kept as simple local state rather than a router,
// since these three screens are the only "logged out" destinations.

import { useState } from "react";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import ForgotPasswordPage from "./ForgotPasswordPage";

export default function AuthGate() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"

  return (
    <div className="page">
      {mode === "login" && (
        <LoginPage onSwitchToSignup={() => setMode("signup")} onSwitchToForgot={() => setMode("forgot")} />
      )}
      {mode === "signup" && <SignupPage onSwitchToLogin={() => setMode("login")} />}
      {mode === "forgot" && <ForgotPasswordPage onSwitchToLogin={() => setMode("login")} />}
    </div>
  );
}
