"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { WORK_LOCATION_LABELS, type WorkLocation } from "@bsr/shared";

interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  performer: { id: string; name: string };
  jobDescription: string | null;
  locations: WorkLocation[];
  riskAssessment: boolean | null;
  comments: string | null;
  workDates: { id: string; date: string; status: string }[];
  approvedDays: number;
  evidenceDocuments: { id: string; fileName: string }[];
  submittedAt: string | null;
  decidedAt: string | null;
}

export default function SoloSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ record: RecordDetail }>(`/api/work-records/${params.id}`).then((data) => {
      setRecord(data.record);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <p className="muted">Loading...</p>;
  if (!record) return <p className="muted">Not found.</p>;

  return (
    <div>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => router.push("/dashboard/solo-submissions")}>
        ← Back to Solo Submissions
      </button>

      <h1 className="page-title">{record.performer.name}</h1>
      <div className="page-title-underline" />
      <p className="page-subtitle" style={{ marginTop: -18 }}>
        {record.productionName} · Solo/Self-Coordinated · {record.decidedAt ? new Date(record.decidedAt).toLocaleDateString() : ""}
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between">
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              APPROVED DAYS
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--bsr-teal-dark)" }}>{record.approvedDays}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, color: "var(--bsr-teal-dark)" }}>Job Details</h2>
        <p>
          <strong>Description:</strong> {record.jobDescription || "—"}
        </p>
        <p>
          <strong>Location(s):</strong> {record.locations.map((l) => WORK_LOCATION_LABELS[l]).join(", ") || "—"}
        </p>
        <p>
          <strong>Risk assessment carried out:</strong> {record.riskAssessment ? "Yes" : "No"}
        </p>
        {record.comments && (
          <p>
            <strong>Comments:</strong> {record.comments}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, color: "var(--bsr-teal-dark)" }}>Claimed Dates ({record.workDates.filter((d) => d.status === "CLAIMED").length})</h2>
        <p className="muted">
          {record.workDates
            .filter((d) => d.status === "CLAIMED")
            .map((d) => new Date(d.date).toLocaleDateString())
            .join(", ") || "None"}
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, color: "var(--bsr-teal-dark)" }}>Supporting Evidence ({record.evidenceDocuments.length})</h2>
        {record.evidenceDocuments.length === 0 && <p className="muted">None uploaded.</p>}
        {record.evidenceDocuments.map((doc) => (
          <a key={doc.id} href={`/api/work-records/${record.id}/evidence/${doc.id}`} target="_blank" rel="noreferrer" style={{ display: "block", marginBottom: 6 }}>
            {doc.fileName}
          </a>
        ))}
      </div>
    </div>
  );
}
