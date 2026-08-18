import { put, get, del } from "@vercel/blob";
import { EVIDENCE_ALLOWED_MIME_TYPES, EVIDENCE_MAX_BYTES } from "@bsr/shared";

export function validateEvidenceFile(mimeType: string, sizeBytes: number) {
  if (!EVIDENCE_ALLOWED_MIME_TYPES.includes(mimeType as any)) {
    return "Unsupported file type. Upload a PDF, JPEG or PNG.";
  }
  if (sizeBytes > EVIDENCE_MAX_BYTES) {
    return "File is too large (max 20MB).";
  }
  return null;
}

// Private Blob store (spec §29 "authenticated/private storage") — the blob itself requires
// authentication to read, not just an unguessable URL. Returns the pathname, which is what
// EvidenceDocument.fileUrl stores; serving it back to a user goes through an authenticated
// route that calls fetchEvidence() below, never a direct link to the blob store.
export async function uploadEvidence(workRecordId: string, fileName: string, file: Blob) {
  const key = `evidence/${workRecordId}/${Date.now()}-${fileName}`;
  const result = await put(key, file, { access: "private" });
  return result.pathname;
}

export async function fetchEvidence(pathname: string) {
  return get(pathname, { access: "private" });
}

// Once an upgrade is decided, the evidence backing it is no longer needed — the production/day/
// identifiable counts it was frozen against (UpgradeApplicationEvidence) already tell the whole
// story. Deleting the underlying files here rather than letting them sit forever is what keeps
// blob storage from growing without bound over years of upgrades.
export async function deleteEvidence(pathnames: string[]) {
  if (pathnames.length === 0) return;
  await del(pathnames);
}
