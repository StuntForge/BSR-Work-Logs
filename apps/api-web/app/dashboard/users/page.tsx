"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { GRADE_KEYS, GRADE_LABELS } from "@bsr/shared";
import { IconSearch, IconKey, IconUserOff, IconClipboardList } from "../Icons";

interface Member {
  id: string;
  firstName: string;
  surname: string;
  name: string;
  email: string;
  active: boolean;
  currentGrade: { key: string; label: string } | null;
  healthSafetyLevel: number;
  dateJoined: string | null;
  lastUpgradedAt: string | null;
}

type SortField = "firstName" | "surname" | "grade" | "status" | "dateJoined";
type SortDirection = "asc" | "desc";

const GRADE_RANK: Record<string, number> = Object.fromEntries(GRADE_KEYS.map((k, i) => [k, i]));

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function initials(firstName: string, surname: string) {
  return ((firstName[0] ?? "") + (surname[0] ?? "")).toUpperCase();
}

export default function UsersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({ field: "surname", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function setMemberDate(m: Member, field: "dateJoined" | "lastUpgradedAt", value: string) {
    await apiFetch(`/api/committee/members/${m.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value || null }) });
    load();
  }

  function toggleSort(field: SortField) {
    setSort((s) => (s.field === field ? { field, direction: s.direction === "asc" ? "desc" : "asc" } : { field, direction: "asc" }));
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const active = sort.field === field;
    return (
      <th className="sortable-th" onClick={() => toggleSort(field)}>
        {children} <span className="sort-arrow">{active ? (sort.direction === "asc" ? "▲" : "▼") : ""}</span>
      </th>
    );
  }

  const sortedMembers = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...members].sort((a, b) => {
      switch (sort.field) {
        case "firstName":
          return a.firstName.localeCompare(b.firstName) * dir;
        case "surname":
          return a.surname.localeCompare(b.surname) * dir;
        case "grade":
          return ((GRADE_RANK[a.currentGrade?.key ?? ""] ?? -1) - (GRADE_RANK[b.currentGrade?.key ?? ""] ?? -1)) * dir;
        case "status":
          return (Number(a.active) - Number(b.active)) * dir;
        case "dateJoined":
          return ((a.dateJoined ? new Date(a.dateJoined).getTime() : 0) - (b.dateJoined ? new Date(b.dateJoined).getTime() : 0)) * dir;
        default:
          return 0;
      }
    });
  }, [members, sort]);

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
      <p className="page-subtitle">
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
      </div>

      <div className="tabs">
        <button className={`tab ${gradeFilter === null ? "active" : ""}`} onClick={() => setGradeFilter(null)}>
          All
        </button>
        {GRADE_KEYS.map((k) => (
          <button key={k} className={`tab ${gradeFilter === k ? "active" : ""}`} onClick={() => setGradeFilter(k)}>
            {GRADE_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <SortHeader field="firstName">First Name</SortHeader>
                <SortHeader field="surname">Surname</SortHeader>
                <th>Email</th>
                <SortHeader field="grade">Grade</SortHeader>
                <SortHeader field="status">Status</SortHeader>
                <th>H&amp;S Level</th>
                <SortHeader field="dateJoined">Date Joined</SortHeader>
                <th>Last Upgraded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="name-cell">
                      <span className="avatar">{initials(m.firstName, m.surname)}</span>
                      <strong>{m.firstName}</strong>
                    </div>
                  </td>
                  <td>{m.surname}</td>
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
                    <input
                      className="input"
                      type="date"
                      style={{ width: 150 }}
                      value={toDateInputValue(m.dateJoined)}
                      onChange={(e) => setMemberDate(m, "dateJoined", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="date"
                      style={{ width: 150 }}
                      value={toDateInputValue(m.lastUpgradedAt)}
                      onChange={(e) => setMemberDate(m, "lastUpgradedAt", e.target.value)}
                    />
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn btn-tinted-teal" onClick={() => resetPassword(m)}>
                        <IconKey />
                        Reset password
                      </button>
                      <button className={`btn ${m.active ? "btn-tinted-red" : "btn-tinted-teal"}`} onClick={() => toggleActive(m)}>
                        <IconUserOff />
                        {m.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button className="btn" onClick={() => router.push(`/dashboard/users/${m.id}/upgrade-history`)}>
                        <IconClipboardList />
                        Audit - View Previous Upgrades
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
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
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [gradeKey, setGradeKey] = useState<string>(GRADE_KEYS[0]);
  const [dateJoined, setDateJoined] = useState("");
  const [lastUpgradedAt, setLastUpgradedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isProbationary = gradeKey === "PROBATIONARY";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ tempPassword: string }>("/api/committee/members", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          surname,
          email,
          gradeKey,
          dateJoined: dateJoined || null,
          lastUpgradedAt: !isProbationary && lastUpgradedAt ? lastUpgradedAt : null,
        }),
      });
      onCreated(data.tempPassword, `${firstName} ${surname}`);
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
          <label className="label">First name</label>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Surname</label>
          <input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} required />
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
        <div className="field">
          <label className="label">Date joined</label>
          <input className="input" type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} />
        </div>
        {!isProbationary && (
          <div className="field">
            <label className="label">Date of last upgrade</label>
            <input className="input" type="date" value={lastUpgradedAt} onChange={(e) => setLastUpgradedAt(e.target.value)} />
          </div>
        )}
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
