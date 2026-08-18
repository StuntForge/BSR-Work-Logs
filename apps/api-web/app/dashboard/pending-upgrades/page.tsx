"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { GRADE_LABELS, type GradeKey } from "@bsr/shared";
import { IconInbox } from "../Icons";

// Tab keys match the API response's grouping (by the grade being applied FOR — the route),
// but each tab is labelled by the applicant's CURRENT grade, since that's what's meaningful to
// the committee scanning the list. There's no "Full Member" tab because nobody applies from
// Full Member — it's the top grade with no further route (spec §2, §19).
const TABS: { key: GradeKey; label: string }[] = [
  { key: "STUNT_PERFORMER", label: GRADE_LABELS.PROBATIONARY },
  { key: "SENIOR_STUNT_PERFORMER", label: GRADE_LABELS.STUNT_PERFORMER },
  { key: "KEY_STUNT_PERFORMER", label: GRADE_LABELS.SENIOR_STUNT_PERFORMER },
  { key: "FULL_MEMBER", label: GRADE_LABELS.KEY_STUNT_PERFORMER },
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
      <div className="page-title-underline" />
      <p className="page-subtitle">
        Members who have submitted for each upgrade route.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${active === t.key ? "active" : ""}`} onClick={() => setActive(t.key)}>
            → {t.label} {tabs[t.key]?.length ? `(${tabs[t.key].length})` : ""}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconInbox />
            </div>
            <div className="empty-state-title">Nothing pending in this route.</div>
            <div className="empty-state-subtitle">No members have submitted upgrade requests for this route yet.</div>
          </div>
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
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
