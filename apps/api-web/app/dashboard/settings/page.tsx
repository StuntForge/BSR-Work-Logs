"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

interface Me {
  id: string;
  name: string;
  email: string;
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ user: Me }>("/api/auth/me").then((data) => {
      setMe(data.user);
      setEmail(data.user.email);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    const emailChanged = me && email.toLowerCase() !== me.email.toLowerCase();
    if (!emailChanged && !newPassword) {
      setError("Change the email or set a new password before saving.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          email: emailChanged ? email : undefined,
          newPassword: newPassword || undefined,
        }),
      });
      setNotice("Committee login updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const data = await apiFetch<{ user: Me }>("/api/auth/me");
      setMe(data.user);
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
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Manage the committee login for this portal. This is the only username and password that can sign in here —
        it's separate from BSR member accounts, which are managed under Users and sign in to the mobile app instead.
      </p>

      <form className="card stack" style={{ maxWidth: 440 }} onSubmit={submit}>
        <h2 style={{ margin: 0, fontSize: 16, color: "var(--bsr-teal-dark)" }}>Committee Login</h2>

        <div className="field">
          <label className="label">Email (username)</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            placeholder="Leave blank to keep current password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        {newPassword && (
          <div className="field">
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label className="label">Current password</label>
          <input
            className="input"
            type="password"
            placeholder="Required to save any change"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error-text">{error}</div>}
        {notice && <div style={{ color: "var(--bsr-teal-dark)", fontSize: 13, fontWeight: 600 }}>{notice}</div>}

        <button className="btn btn-primary" disabled={saving} type="submit">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
