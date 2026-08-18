"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";

const CATEGORY_LABELS: Record<string, string> = {
  UPGRADE_QUERIES: "Upgrade Queries",
  BUG_REPORTS: "Bug Reports",
  OTHER: "Other",
};

interface TicketDetail {
  id: string;
  category: string;
  title: string;
  message: string;
  status: string;
  response: string | null;
  respondedAt: string | null;
  respondedBy: { id: string; name: string } | null;
  createdAt: string;
  canRespond: boolean;
  member: { id: string; name: string; email: string; grade: string | null };
}

export function SupportTicketClient({ id }: { id: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ ticket: TicketDetail }>(`/api/committee/support-tickets/${id}`).then((data) => setTicket(data.ticket));
  }, [id]);

  async function respond() {
    if (!message.trim()) {
      setError("A response message is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/committee/support-tickets/${id}/respond`, { method: "POST", body: JSON.stringify({ message: message.trim() }) });
      router.back();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!ticket) return <p className="muted">Loading...</p>;

  const isBugReport = ticket.category === "BUG_REPORTS";
  const closedLabel = isBugReport ? "Fixed" : "Closed";

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{ticket.title}</h1>
        <p className="page-subtitle">
          {ticket.member.name} · {ticket.member.grade ?? "—"} · submitted {new Date(ticket.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="card row" style={{ gap: 32 }}>
        <div>
          <div className="muted">Category</div>
          <strong>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</strong>
        </div>
        <div>
          <div className="muted">Status</div>
          <span className={`badge ${ticket.status === "OPEN" ? "badge-amber" : "badge-green"}`}>{ticket.status === "OPEN" ? "Open" : closedLabel}</span>
        </div>
        <div>
          <div className="muted">Member email</div>
          <strong>{ticket.member.email}</strong>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Message</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{ticket.message}</p>
      </div>

      {ticket.status === "CLOSED" ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Response</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {ticket.respondedBy?.name ?? "Committee"} · {ticket.respondedAt ? new Date(ticket.respondedAt).toLocaleDateString() : ""}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{ticket.response}</p>
        </div>
      ) : ticket.canRespond ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Respond</h2>
          <div className="field">
            <label className="label">Message</label>
            <textarea className="input" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="row">
            <button className="btn btn-primary" disabled={saving} onClick={respond}>
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            This is a Bug Report — it can only be dealt with by the Administrator.
          </p>
        </div>
      )}
    </div>
  );
}
