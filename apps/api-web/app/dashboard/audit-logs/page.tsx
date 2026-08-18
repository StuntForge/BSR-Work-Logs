"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { IconClipboardList } from "../Icons";

interface AuditEntry {
  id: string;
  actorName: string;
  description: string;
  createdAt: string;
  createdAtLabel: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ entries: AuditEntry[] }>("/api/committee/audit-logs").then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Audit Logs</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle">
        Every portal user's actions here, for full accountability — rolling 90 days. The
        administrator's own actions aren't recorded.
      </p>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconClipboardList />
            </div>
            <div className="empty-state-title">Nothing here yet.</div>
            <div className="empty-state-subtitle">Portal actions will appear here as they happen.</div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 0 }}>
            {entries.map((e, i) => (
              <div
                key={e.id}
                style={{
                  padding: "12px 0",
                  borderBottom: i < entries.length - 1 ? "1px solid var(--bsr-border)" : "none",
                }}
              >
                <span>
                  <strong>{e.actorName}</strong> {e.description}
                </span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {e.createdAtLabel} · {formatTime(e.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
