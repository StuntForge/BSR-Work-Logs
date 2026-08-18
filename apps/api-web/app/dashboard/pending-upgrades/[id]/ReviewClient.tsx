"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";

type DocumentType = "CONTRACT" | "RISK_ASSESSMENT" | "RECCE_DOCUMENTATION" | "OTHER";

const DOCUMENT_TYPE_ORDER: DocumentType[] = ["CONTRACT", "RISK_ASSESSMENT", "RECCE_DOCUMENTATION", "OTHER"];
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CONTRACT: "Contract",
  RISK_ASSESSMENT: "Risk Assessment",
  RECCE_DOCUMENTATION: "Recce Documentation",
  OTHER: "Other",
};

interface Production {
  workRecordId: string;
  productionName: string;
  approvedDays: number;
  identifiableCount: number;
  fullMember: { id: string; name: string } | null;
  evidenceDocuments: { id: string; fileUrl: string; fileName: string; documentType: DocumentType }[];
}
interface ConsolidatedIdentifiable {
  id: string;
  category: string;
  verifiedDescription: string;
  productionName: string;
  approvedBy: string | null;
}
interface ReviewData {
  application: {
    id: string;
    status: string;
    submittedAt: string;
    member: { id: string; name: string; email: string };
    fromGrade: { key: string; label: string } | null;
    toGrade: { key: string; label: string } | null;
  };
  totalApprovedDays: number;
  productions: Production[];
  soloSubmissions: Production[];
  coreTeamJobs: Production[];
  consolidatedIdentifiables: ConsolidatedIdentifiable[];
}

function ProductionTable({ rows, showApprovedBy, emptyText }: { rows: Production[]; showApprovedBy: boolean; emptyText: string }) {
  if (rows.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Production</th>
          <th>Days</th>
          <th>Identifiables</th>
          {showApprovedBy && <th>Approved by</th>}
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.workRecordId}>
            <td>{p.productionName}</td>
            <td>{p.approvedDays}</td>
            <td>{p.identifiableCount}</td>
            {showApprovedBy && <td>{p.fullMember?.name ?? "—"}</td>}
            <td>
              {p.evidenceDocuments.length === 0 && <span className="muted">None</span>}
              {DOCUMENT_TYPE_ORDER.map((type) => {
                const docs = p.evidenceDocuments.filter((d) => d.documentType === type);
                if (docs.length === 0) return null;
                return (
                  <div key={type} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--bsr-teal-dark)" }}>{DOCUMENT_TYPE_LABELS[type]}</div>
                    {docs.map((doc) => (
                      <a key={doc.id} href={`/api/work-records/${p.workRecordId}/evidence/${doc.id}`} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                        {doc.fileName}
                      </a>
                    ))}
                  </div>
                );
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReviewClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<ReviewData>(`/api/committee/upgrade-applications/${id}`).then(setData);
  }, [id]);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !message.trim()) {
      setError("A reason is required when rejecting.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/committee/upgrade-applications/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, message: message || undefined }),
      });
      router.push("/dashboard/pending-upgrades");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!data) return <p className="muted">Loading...</p>;

  const totalDays = data.totalApprovedDays;
  const totalIdentifiables = data.consolidatedIdentifiables.length;
  const isSeniorApplicant = data.application.fromGrade?.key === "SENIOR_STUNT_PERFORMER";

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{data.application.member.name}</h1>
        <p className="page-subtitle">
          {data.application.fromGrade?.label} → {data.application.toGrade?.label} · submitted{" "}
          {new Date(data.application.submittedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="card row" style={{ gap: 32 }}>
        <div>
          <div className="muted">Total approved days</div>
          <strong style={{ fontSize: 22 }}>{totalDays}</strong>
        </div>
        <div>
          <div className="muted">Total identifiables</div>
          <strong style={{ fontSize: 22 }}>{totalIdentifiables}</strong>
        </div>
        <div>
          <div className="muted">Productions</div>
          <strong style={{ fontSize: 22 }}>{data.productions.length}</strong>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Production list</h2>
        <ProductionTable rows={data.productions} showApprovedBy emptyText="No productions in this application." />
      </div>

      {isSeniorApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Solo/Self-Coordinated</h2>
          <ProductionTable rows={data.soloSubmissions} showApprovedBy={false} emptyText="No Solo/Self-Coordinated submissions." />
        </div>
      )}

      {isSeniorApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Core Teams</h2>
          <ProductionTable rows={data.coreTeamJobs} showApprovedBy emptyText="No Core Team jobs." />
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Consolidated identifiables</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Production</th>
              <th>Approved by</th>
            </tr>
          </thead>
          <tbody>
            {data.consolidatedIdentifiables.map((i) => (
              <tr key={i.id}>
                <td>{i.category}</td>
                <td>{i.verifiedDescription}</td>
                <td>{i.productionName}</td>
                <td>{i.approvedBy ?? "—"}</td>
              </tr>
            ))}
            {data.consolidatedIdentifiables.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No identifiables in this application.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.application.status === "PENDING" ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Decision</h2>
          <div className="field">
            <label className="label">Message (optional on approve, required on reject)</label>
            <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="row">
            <button className="btn btn-primary" disabled={saving} onClick={() => decide("APPROVED")}>
              Approve
            </button>
            <button className="btn btn-danger" disabled={saving} onClick={() => decide("REJECTED")}>
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <span className={`badge ${data.application.status === "APPROVED" ? "badge-green" : "badge-red"}`}>{data.application.status}</span>
        </div>
      )}
    </div>
  );
}
