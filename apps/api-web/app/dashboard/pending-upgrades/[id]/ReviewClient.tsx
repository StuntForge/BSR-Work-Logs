"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { IconCalendar } from "../../Icons";

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
  dates: string[];
}
interface ConsolidatedIdentifiable {
  id: string;
  category: string;
  verifiedDescription: string;
  productionName: string;
  approvedBy: string | null;
  selfCoordinated: boolean;
}
interface PointsBreakdown {
  soloDays: number;
  soloPoints: number;
  unitCoordinatorDays: number;
  unitCoordinatorPoints: number;
  assistantCoordinatorDays: number;
  assistantCoordinatorPoints: number;
  selfCoordinatingCount: number;
  selfCoordinatingPoints: number;
  groupABPoints: number;
  groupCDPoints: number;
  groupCDCounted: number;
  totalPoints: number;
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
  unitCoordinatorJobs: Production[];
  assistantCoordinatorJobs: Production[];
  consolidatedIdentifiables: ConsolidatedIdentifiable[];
  selfCoordinatedIdentifiables: ConsolidatedIdentifiable[];
  pointsBreakdown: PointsBreakdown | null;
}

function DatesCalendarModal({ dates, productionName, onClose }: { dates: string[]; productionName: string; onClose: () => void }) {
  const sorted = [...dates].sort();
  const firstDate = sorted.length > 0 ? new Date(sorted[0]) : new Date();
  const [monthCursor, setMonthCursor] = useState(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));

  const claimedSet = new Set(sorted.map((d) => new Date(d).toDateString()));
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,47,49,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}
      onClick={onClose}
    >
      <div className="card stack" style={{ width: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <strong>{productionName}</strong>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="row-between">
          <button className="btn" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>
            ‹
          </button>
          <strong>{monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button className="btn" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>
            ›
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="muted" style={{ fontSize: 11 }}>
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const isClaimed = claimedSet.has(new Date(year, month, day).toDateString());
            return (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  lineHeight: "30px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: isClaimed ? "#3a9e5f" : "transparent",
                  color: isClaimed ? "#fff" : "inherit",
                  fontWeight: isClaimed ? 700 : 400,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductionTable({ rows, showApprovedBy, emptyText }: { rows: Production[]; showApprovedBy: boolean; emptyText: string }) {
  const [viewingDates, setViewingDates] = useState<Production | null>(null);

  if (rows.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Production</th>
            <th>Days</th>
            <th>Dates</th>
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
              <td>
                {p.dates.length > 0 ? (
                  <button className="btn" title="View dates" onClick={() => setViewingDates(p)}>
                    <IconCalendar />
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
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
      {viewingDates && (
        <DatesCalendarModal dates={viewingDates.dates} productionName={viewingDates.productionName} onClose={() => setViewingDates(null)} />
      )}
    </>
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
  const isKeyApplicant = data.application.fromGrade?.key === "KEY_STUNT_PERFORMER";
  const points = data.pointsBreakdown;

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

      {points && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Points breakdown</h2>
          <p className="page-subtitle" style={{ marginTop: -8 }}>
            Solo/Unit Coordinator points are uncapped; Assistant Coordinator + Self-Coordinating points count for at most 60 toward the 80 total.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Solo/Self-Coordinated days (2 pts each)</td>
                <td>{points.soloDays}</td>
                <td>{points.soloPoints}</td>
              </tr>
              <tr>
                <td>Unit Coordinator days (1 pt each)</td>
                <td>{points.unitCoordinatorDays}</td>
                <td>{points.unitCoordinatorPoints}</td>
              </tr>
              <tr>
                <td>Assistant Coordinator days (1 pt each)</td>
                <td>{points.assistantCoordinatorDays}</td>
                <td>{points.assistantCoordinatorPoints}</td>
              </tr>
              <tr>
                <td>Self-Coordinated identifiables on another Coordinator's job (1 pt each)</td>
                <td>{points.selfCoordinatingCount}</td>
                <td>{points.selfCoordinatingPoints}</td>
              </tr>
            </tbody>
          </table>
          <div className="row" style={{ gap: 32, marginTop: 12 }}>
            <div>
              <div className="muted">Solo + Unit Coordinator (uncapped)</div>
              <strong style={{ fontSize: 18 }}>{points.groupABPoints}</strong>
            </div>
            <div>
              <div className="muted">Assistant + Self-Coordinating (capped at 60)</div>
              <strong style={{ fontSize: 18 }}>{points.groupCDCounted}</strong>
              {points.groupCDPoints > 60 && <span className="muted"> (of {points.groupCDPoints})</span>}
            </div>
            <div>
              <div className="muted">Total towards 80</div>
              <strong style={{ fontSize: 18 }}>{points.totalPoints}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Production list</h2>
        <ProductionTable rows={data.productions} showApprovedBy emptyText="No productions in this application." />
      </div>

      {(isSeniorApplicant || isKeyApplicant) && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Solo/Self-Coordinated work logs</h2>
          <ProductionTable rows={data.soloSubmissions} showApprovedBy={false} emptyText="No Solo/Self-Coordinated submissions." />
        </div>
      )}

      {isSeniorApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Core Teams</h2>
          <ProductionTable rows={data.coreTeamJobs} showApprovedBy emptyText="No Core Team jobs." />
        </div>
      )}

      {isKeyApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Unit Coordinator work logs</h2>
          <ProductionTable rows={data.unitCoordinatorJobs} showApprovedBy emptyText="No Unit Coordinator work logs." />
        </div>
      )}

      {isKeyApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Assistant Coordinator work logs</h2>
          <ProductionTable rows={data.assistantCoordinatorJobs} showApprovedBy emptyText="No Assistant Coordinator work logs." />
        </div>
      )}

      {isKeyApplicant && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Self-Coordinated identifiables on another Coordinator's job</h2>
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
              {data.selfCoordinatedIdentifiables.map((i) => (
                <tr key={i.id}>
                  <td>{i.category}</td>
                  <td>{i.verifiedDescription}</td>
                  <td>{i.productionName}</td>
                  <td>{i.approvedBy ?? "—"}</td>
                </tr>
              ))}
              {data.selfCoordinatedIdentifiables.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No self-coordinated identifiables in this application.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
