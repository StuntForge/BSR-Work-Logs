"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { IconKey, IconUserOff } from "../Icons";

interface CommitteeUser {
  id: string;
  name: string;
  username: string | null;
  active: boolean;
  createdAt: string;
}

export default function CommitteeUsersPage() {
  const [users, setUsers] = useState<CommitteeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ users: CommitteeUser[] }>("/api/committee/committee-users");
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(u: CommitteeUser) {
    await apiFetch(`/api/committee/committee-users/${u.id}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) });
    load();
  }

  async function resetPassword(u: CommitteeUser) {
    const data = await apiFetch<{ tempPassword: string }>(`/api/committee/committee-users/${u.id}/reset-password`, { method: "POST" });
    setNotice(`New temporary password for ${u.name}: ${data.tempPassword}`);
  }

  return (
    <div>
      <div className="row-between">
        <div>
          <h1 className="page-title">Committee Users</h1>
          <div className="page-title-underline" />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New account
        </button>
      </div>
      <p className="page-subtitle">Committee login accounts for this portal — administrator only.</p>

      {notice && (
        <div className="card" style={{ marginBottom: 16, background: "var(--bsr-teal-light)" }}>
          <div className="row-between">
            <span>{notice}</span>
            <button className="btn" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.username}</td>
                  <td>
                    <span className={`badge ${u.active ? "badge-green" : "badge-red"}`}>
                      <span className="badge-dot" />
                      {u.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row">
                      <button className="btn" onClick={() => resetPassword(u)}>
                        <IconKey />
                        Reset password
                      </button>
                      <button className="btn" onClick={() => toggleActive(u)}>
                        <IconUserOff />
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No committee users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateCommitteeUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(tempPassword, name) => {
            setShowCreate(false);
            setNotice(`Account created for ${name}. Temporary password: ${tempPassword}`);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateCommitteeUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (tempPassword: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ tempPassword: string }>("/api/committee/committee-users", {
        method: "POST",
        body: JSON.stringify({ name, username }),
      });
      onCreated(data.tempPassword, name);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,47,49,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}
      onClick={onClose}
    >
      <form className="card stack" style={{ width: 380 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ margin: 0, color: "var(--bsr-teal-dark)" }}>New committee account</h2>
        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Username</label>
          <input className="input" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
