import { useEffect, useState } from "react";
import { fetchHealth } from "./api/client";
import { useAuth } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [health, setHealth] = useState("checking");
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchHealth()
      .then(() => setHealth("ok"))
      .catch(() => setHealth("down"));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Student Guardian</h1>
        <div className="header-right">
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
        {user === null && <LoginPage />}
        {user && <ProfilePage />}
      </main>
    </div>
  );
}
