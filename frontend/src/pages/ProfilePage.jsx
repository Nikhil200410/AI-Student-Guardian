// ProfilePage.jsx
// The "screen" for Phase 0. It owns the profile state and decides which
// view to show: loading, error, empty (no profile yet -> show create form),
// viewing (show card), or editing (show form pre-filled).

import { useEffect, useState } from "react";
import {
  fetchProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../api/client";
import ProfileCard from "../components/ProfileCard";
import ProfileForm from "../components/ProfileForm";

export default function ProfilePage() {
  const [profile, setProfile] = useState(undefined); // undefined = still loading
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data); // null means "no profile yet"
    } catch (err) {
      console.error(err);
      setError("Could not reach the server. Is the backend running?");
      setProfile(null);
    }
  }

  async function handleSave(values) {
    setSubmitting(true);
    setError(null);
    try {
      const saved = profile ? await updateProfile(values) : await createProfile(values);
      setProfile(saved);
      setMode("view");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Could not save the profile.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete your profile? This cannot be undone.")) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteProfile();
      setProfile(null);
    } catch (err) {
      console.error(err);
      setError("Could not delete the profile.");
    } finally {
      setSubmitting(false);
    }
  }

  if (profile === undefined) {
    return <p className="status">Loading your profile...</p>;
  }

  return (
    <div className="page">
      <h1>Student Profile</h1>
      {error && <p className="form-error">{error}</p>}

      {mode === "edit" ? (
        <ProfileForm
          initialValues={profile || undefined}
          submitting={submitting}
          onSubmit={handleSave}
          onCancel={profile ? () => setMode("view") : undefined}
        />
      ) : profile ? (
        <ProfileCard profile={profile} onEdit={() => setMode("edit")} onDelete={handleDelete} />
      ) : (
        <div className="card empty-state">
          <p>You haven't created a profile yet.</p>
          <button onClick={() => setMode("edit")}>Create profile</button>
        </div>
      )}
    </div>
  );
}
