"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

interface Me {
  id: string;
  name: string;
  username: string | null;
  isAdmin: boolean;
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ user: Me }>("/api/auth/me").then((data) => setMe(data.user));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setNotice("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle">
        Change your own password. This is separate from BSR member accounts, which are managed under Users and sign
        in to the mobile app instead.
      </p>

      <form className="card stack" style={{ maxWidth: 440 }} onSubmit={submit}>
        <h2 style={{ margin: 0, fontSize: 16, color: "var(--bsr-teal-dark)" }}>{me?.isAdmin ? "Administrator Login" : "My Login"}</h2>

        <div className="field">
          <label className="label">Username</label>
          <input className="input" type="text" value={me?.username ?? ""} disabled />
        </div>

        <div className="field">
          <label className="label">Current password</label>
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>

        <div className="field">
          <label className="label">New password</label>
          <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>

        <div className="field">
          <label className="label">New password again</label>
          <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>

        {error && <div className="error-text">{error}</div>}
        {notice && <div style={{ color: "var(--bsr-teal-dark)", fontSize: 13, fontWeight: 600 }}>{notice}</div>}

        <button className="btn btn-primary" disabled={saving} type="submit">
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
