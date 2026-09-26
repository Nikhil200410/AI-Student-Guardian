import { useEffect, useState } from "react";
import { fetchHealth } from "./api/client";
import { useAuth } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage";
import AuthGate from "./pages/AuthGate";
import DigitalTwinPage from "./pages/DigitalTwinPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AuthCallback from "./pages/AuthCallback";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Lightweight path-based routing for the two Supabase email-link
// callbacks. No router library — these are the only two "real" URLs in
// what is otherwise a single-page app with in-memory view switching.
const path = window.location.pathname;

export default function App() {
  const [health, setHealth] = useState("checking");
  const [page, setPage] = useState("profile"); // "profile" | "digitalTwin" | "changePassword"
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchHealth()
      .then(() => setHealth("ok"))
      .catch(() => setHealth("down"));
  }, []);

  // These two routes must work regardless of auth state — that's the
  // whole point, they're how a session gets established in the first place.
  if (path.startsWith("/auth/callback")) return <AuthCallback />;
  if (path.startsWith("/auth/reset-password")) return <ResetPasswordPage />;

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Student Guardian</h1>
        <div className="header-right">
          {user && (
            <nav className="app-nav">
              <button type="button" className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}>
                Profile
              </button>
              <button
                type="button"
                className={page === "digitalTwin" ? "active" : ""}
                onClick={() => setPage("digitalTwin")}
              >
                Digital Twin
              </button>
              <button
                type="button"
                className={page === "changePassword" ? "active" : ""}
                onClick={() => setPage("changePassword")}
              >
                Change Password
              </button>
            </nav>
          )}
          <span className={`badge badge-${health}`}>
            {health === "checking" && "Checking backend..."}
            {health === "ok" && "Backend connected"}
            {health === "down" && "Backend unreachable"}
          </span>
          {user && (
            <button type="button" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>
      <main>
        {user === undefined && <p className="status">Checking your session...</p>}
        {user === null && <AuthGate />}
        {user && page === "profile" && <ProfilePage />}
        {user && page === "digitalTwin" && <DigitalTwinPage />}
        {user && page === "changePassword" && <ChangePasswordPage />}
      </main>
    </div>
  );
}
