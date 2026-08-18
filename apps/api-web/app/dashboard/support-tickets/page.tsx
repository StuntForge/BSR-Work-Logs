"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { IconInbox } from "../Icons";

const CATEGORY_LABELS: Record<string, string> = {
  UPGRADE_QUERIES: "Upgrade Queries",
  BUG_REPORTS: "Bug Reports",
  OTHER: "Other",
};

interface TicketItem {
  id: string;
  category: string;
  title: string;
  status: string;
  createdAt: string;
  member: { id: string; name: string; grade: string | null };
}

const TABS: { key: string; label: string }[] = [
  { key: "OPEN", label: "Open Tickets" },
  { key: "CLOSED", label: "Closed Tickets" },
];

export default function SupportTicketsPage() {
  const router = useRouter();
  const [active, setActive] = useState("OPEN");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ tickets: TicketItem[] }>(`/api/committee/support-tickets?status=${active}&category=UPGRADE_QUERIES,OTHER`).then((data) => {
      setTickets(data.tickets);
      setLoading(false);
    });
  }, [active]);

  return (
    <div>
      <h1 className="page-title">Support Tickets</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Queries and reports submitted by members through the app.
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
              <IconInbox />
            </div>
            <div className="empty-state-title">Nothing here.</div>
            <div className="empty-state-subtitle">No {active === "OPEN" ? "open" : "closed"} tickets right now.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Member</th>
                <th>Grade</th>
                <th>Title</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => router.push(`/dashboard/support-tickets/${t.id}`)}>
                  <td>{CATEGORY_LABELS[t.category] ?? t.category}</td>
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
