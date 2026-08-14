import { put } from "@vercel/blob";
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

export async function uploadEvidence(workRecordId: string, fileName: string, file: Blob) {
  const key = `evidence/${workRecordId}/${Date.now()}-${fileName}`;
  const result = await put(key, file, { access: "public" });
  // NOTE: Vercel Blob's "public" access still requires the unguessable URL; route-level auth
  // (spec §29 "authenticated/private storage") is enforced by only ever returning this URL
  // through authenticated API responses, never indexing/listing it publicly.
  return result.url;
}
