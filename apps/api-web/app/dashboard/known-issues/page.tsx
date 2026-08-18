"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { IconShield } from "../Icons";

interface TicketItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  member: { id: string; name: string; grade: string | null };
}

const TABS: { key: string; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "CLOSED", label: "Fixed" },
];

// Bug Reports are just Support Tickets filtered to category=BUG_REPORTS, given their own page
// so the committee can track them separately from general queries. Detail/response happens on
// the shared /dashboard/support-tickets/:id page — same data, same flow, no duplicated UI.
export default function KnownIssuesPage() {
  const router = useRouter();
  const [active, setActive] = useState("OPEN");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ tickets: TicketItem[] }>(`/api/committee/support-tickets?status=${active}&category=BUG_REPORTS`).then((data) => {
      setTickets(data.tickets);
      setLoading(false);
    });
  }, [active]);

  return (
    <div>
      <h1 className="page-title">Known Issues</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Bug reports submitted by members through the app.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${active === t.key ? "active" : ""}`} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconShield />
            </div>
            <div className="empty-state-title">Nothing here.</div>
            <div className="empty-state-subtitle">No {active === "OPEN" ? "open" : "fixed"} bug reports right now.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Grade</th>
                <th>Title</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => router.push(`/dashboard/support-tickets/${t.id}`)}>
                  <td>{t.member.name}</td>
                  <td>{t.member.grade ?? "—"}</td>
                  <td>{t.title}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
