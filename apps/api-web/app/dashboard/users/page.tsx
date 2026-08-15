"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/client-api";
import { GRADE_KEYS, GRADE_LABELS } from "@bsr/shared";
import { IconSearch, IconFilter, IconChevronDown, IconKey, IconUserOff } from "../Icons";

interface Member {
  id: string;
  name: string;
  email: string;
  active: boolean;
  currentGrade: { key: string; label: string } | null;
  healthSafetyLevel: number;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (gradeFilter) params.set("gradeKey", gradeFilter);
    const data = await apiFetch<{ members: Member[] }>(`/api/committee/members?${params.toString()}`);
    setMembers(data.members);
    setLoading(false);
  }, [query, gradeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleActive(m: Member) {
    await apiFetch(`/api/committee/members/${m.id}`, { method: "PATCH", body: JSON.stringify({ active: !m.active }) });
    load();
  }

  async function resetPassword(m: Member) {
    const data = await apiFetch<{ tempPassword: string }>(`/api/committee/members/${m.id}/reset-password`, { method: "POST" });
    setNotice(`New temporary password for ${m.name}: ${data.tempPassword}`);
  }

  async function setHealthSafetyLevel(m: Member, level: number) {
    await apiFetch(`/api/committee/members/${m.id}/health-safety`, { method: "PATCH", body: JSON.stringify({ level }) });
    load();
  }

  const filterLabel = gradeFilter ? GRADE_LABELS[gradeFilter as keyof typeof GRADE_LABELS] : "All";

  return (
    <div>
      <div className="row-between">
        <div>
          <h1 className="page-title">Users</h1>
          <div className="page-title-underline" />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New account
        </button>
      </div>
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Every BSR member — these accounts sign in to the mobile app, not this portal.
      </p>

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

      <div className="toolbar">
        <label className="search-input">
          <IconSearch />
          <input placeholder="Search by name, email or grade..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>

        <div className="filter-wrap" ref={filterRef}>
          <button className="btn" onClick={() => setShowFilterMenu((s) => !s)}>
            <IconFilter />
            Filter{gradeFilter ? `: ${filterLabel}` : ""}
            <IconChevronDown />
          </button>
          {showFilterMenu && (
            <div className="filter-menu">
              <button
                className={`filter-option${gradeFilter === null ? " active" : ""}`}
                onClick={() => {
                  setGradeFilter(null);
                  setShowFilterMenu(false);
                }}
              >
                All grades
              </button>
              {GRADE_KEYS.map((k) => (
                <button
                  key={k}
                  className={`filter-option${gradeFilter === k ? " active" : ""}`}
                  onClick={() => {
                    setGradeFilter(k);
                    setShowFilterMenu(false);
                  }}
                >
                  {GRADE_LABELS[k]}
                </button>
              ))}
            </div>
          )}
        </div>
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
                <th>H&amp;S Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="name-cell">
                      <span className="avatar">{initials(m.name)}</span>
                      <strong>{m.name}</strong>
                    </div>
                  </td>
                  <td>{m.email}</td>
                  <td>{m.currentGrade?.label ?? "—"}</td>
                  <td>
                    <span className={`badge ${m.active ? "badge-green" : "badge-red"}`}>
                      <span className="badge-dot" />
                      {m.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td>
                    <select className="input" style={{ width: 90 }} value={m.healthSafetyLevel} onChange={(e) => setHealthSafetyLevel(m, Number(e.target.value))}>
                      <option value={0}>None</option>
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                      <option value={3}>Level 3</option>
                      <option value={4}>Level 4</option>
                    </select>
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn" onClick={() => resetPassword(m)}>
                        <IconKey />
                        Reset password
                      </button>
                      <button className="btn" onClick={() => toggleActive(m)}>
                        <IconUserOff />
                        {m.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No users found.
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
      style={{ position: "fixed", inset: 0, background: "rgba(10,47,49,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}
      onClick={onClose}
    >
      <form className="card stack" style={{ width: 380 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ margin: 0, color: "var(--bsr-teal-dark)" }}>New user account</h2>
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
