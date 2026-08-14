"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { GRADE_KEYS, GRADE_LABELS } from "@bsr/shared";

interface Member {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isCommittee: boolean;
  currentGrade: { key: string; label: string } | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    const data = await apiFetch<{ members: Member[] }>(`/api/committee/members?${params.toString()}`);
    setMembers(data.members);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(m: Member) {
    await apiFetch(`/api/committee/members/${m.id}`, { method: "PATCH", body: JSON.stringify({ active: !m.active }) });
    load();
  }

  async function resetPassword(m: Member) {
    const data = await apiFetch<{ tempPassword: string }>(`/api/committee/members/${m.id}/reset-password`, { method: "POST" });
    setNotice(`New temporary password for ${m.name}: ${data.tempPassword}`);
  }

  return (
    <div>
      <div className="row-between">
        <div>
          <h1 className="page-title">Member Admin</h1>
          <p className="page-subtitle">View, search and manage BSR member accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New account
        </button>
      </div>

      {notice && (
        <div className="card" style={{ marginBottom: 16, background: "var(--bsr-green-light)" }}>
          <div className="row-between">
            <span>{notice}</span>
            <button className="btn" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="field" style={{ maxWidth: 320 }}>
        <input className="input" placeholder="Search by name..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name} {m.isCommittee && <span className="badge badge-gray">Committee</span>}
                  </td>
                  <td>{m.email}</td>
                  <td>{m.currentGrade?.label ?? "—"}</td>
                  <td>
                    <span className={`badge ${m.active ? "badge-green" : "badge-red"}`}>{m.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn" onClick={() => resetPassword(m)}>
                        Reset password
                      </button>
                      <button className="btn" onClick={() => toggleActive(m)}>
                        {m.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateMemberModal
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

function CreateMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: (tempPassword: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gradeKey, setGradeKey] = useState<string>(GRADE_KEYS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ tempPassword: string }>("/api/committee/members", {
        method: "POST",
        body: JSON.stringify({ name, email, gradeKey }),
      });
      onCreated(data.tempPassword, name);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,57,43,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <form className="card stack" style={{ width: 380 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ margin: 0 }}>New member account</h2>
        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Starting grade</label>
          <select className="input" value={gradeKey} onChange={(e) => setGradeKey(e.target.value)}>
            {GRADE_KEYS.map((k) => (
              <option key={k} value={k}>
                {GRADE_LABELS[k]}
              </option>
            ))}
          </select>
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
