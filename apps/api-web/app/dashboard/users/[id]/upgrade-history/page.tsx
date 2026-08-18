"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { IconClipboardList } from "../../../Icons";

interface HistoryEntry {
  id: string;
  fromGrade: { key: string; label: string } | null;
  toGrade: { key: string; label: string } | null;
  decidedAt: string | null;
  decidedByName: string | null;
}

export default function UpgradeHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ member: { name: string }; history: HistoryEntry[] }>(`/api/committee/members/${id}/upgrade-history`).then((data) => {
      setMemberName(data.member.name);
      setHistory(data.history);
      setLoading(false);
    });
  }, [id]);

  return (
    <div>
      <h1 className="page-title">Previous Upgrades</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle">{memberName ? `Every upgrade approved for ${memberName}, newest first.` : "Loading..."}</p>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconClipboardList />
            </div>
            <div className="empty-state-title">No previous upgrades.</div>
            <div className="empty-state-subtitle">This member hasn't had an upgrade approved yet.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Upgraded from</th>
                <th>Upgraded to</th>
                <th>Date</th>
                <th>Approved by</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="clickable" onClick={() => router.push(`/dashboard/pending-upgrades/${h.id}`)}>
                  <td>{h.fromGrade?.label ?? "—"}</td>
                  <td>{h.toGrade?.label ?? "—"}</td>
                  <td>{h.decidedAt ? new Date(h.decidedAt).toLocaleDateString() : "—"}</td>
                  <td>{h.decidedByName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
