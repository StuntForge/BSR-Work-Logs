"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { IconInbox } from "../Icons";

interface SoloSubmission {
  id: string;
  productionName: string;
  performer: { id: string; name: string; email: string };
  days: number;
  evidenceCount: number;
  decidedAt: string;
}

export default function SoloSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SoloSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ submissions: SoloSubmission[] }>("/api/committee/solo-submissions").then((data) => {
      setSubmissions(data.submissions);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Solo Submissions</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        Solo/Self-Coordinated work records — instantly approved on submission, listed here for oversight rather than decision.
      </p>

      <div className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconInbox />
            </div>
            <div className="empty-state-title">No solo submissions yet.</div>
            <div className="empty-state-subtitle">Self-coordinated work records will appear here as members submit them.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Production</th>
                <th>Days</th>
                <th>Evidence</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => router.push(`/dashboard/solo-submissions/${s.id}`)}>
                  <td>{s.performer.name}</td>
                  <td>{s.productionName}</td>
                  <td>{s.days}</td>
                  <td>{s.evidenceCount}</td>
                  <td>{new Date(s.decidedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
