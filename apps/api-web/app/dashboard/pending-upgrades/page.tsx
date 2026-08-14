"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { GRADE_LABELS, type GradeKey } from "@bsr/shared";

const TABS: { key: GradeKey; label: string }[] = [
  { key: "STUNT_PERFORMER", label: `→ ${GRADE_LABELS.STUNT_PERFORMER}` },
  { key: "SENIOR_STUNT_PERFORMER", label: `→ ${GRADE_LABELS.SENIOR_STUNT_PERFORMER}` },
  { key: "KEY_STUNT_PERFORMER", label: `→ ${GRADE_LABELS.KEY_STUNT_PERFORMER}` },
  { key: "FULL_MEMBER", label: `→ ${GRADE_LABELS.FULL_MEMBER}` },
];

interface PendingItem {
  id: string;
  member: { id: string; name: string; email: string };
  submittedAt: string;
}

export default function PendingUpgradesPage() {
  const router = useRouter();
  const [tabs, setTabs] = useState<Record<string, PendingItem[]>>({});
  const [active, setActive] = useState<GradeKey>("STUNT_PERFORMER");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ tabs: Record<string, PendingItem[]> }>("/api/committee/pending-upgrades").then((data) => {
      setTabs(data.tabs);
      setLoading(false);
    });
  }, []);

  const items = tabs[active] ?? [];

  return (
    <div>
      <h1 className="page-title">Pending Upgrades</h1>
      <p className="page-subtitle">Members who have submitted for each upgrade route.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${active === t.key ? "active" : ""}`} onClick={() => setActive(t.key)}>
            {t.label} {tabs[t.key]?.length ? `(${tabs[t.key].length})` : ""}
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
                <th>Member</th>
                <th>Email</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable" onClick={() => router.push(`/dashboard/pending-upgrades/${item.id}`)}>
                  <td>{item.member.name}</td>
                  <td>{item.member.email}</td>
                  <td>{new Date(item.submittedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Nothing pending in this route.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
