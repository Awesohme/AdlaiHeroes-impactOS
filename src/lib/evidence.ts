import { evidenceRows } from "@/lib/sample-records";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type EvidenceRow = {
  id: string | null;
  code: string;
  title: string;
  storage: string;
  status: string;
  rawStatus: string;
  linkedRecord: string;
  uploadedBy: string;
  fileType: string;
  folder: string;
  blocker: string;
  driveFileId: string | null;
  uploadedAt: string | null;
};

export type EvidenceNote = {
  id: string;
  body: string;
  createdAt: string;
  authorEmail: string;
};

type EvidenceRecord = {
  id: string;
  evidence_code: string;
  title: string;
  verification_status: string;
  mime_type: string | null;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  programmes: { name: string | null }[] | null;
  profiles: { email: string | null }[] | null;
};

export async function getEvidenceRecords(): Promise<{
  rows: EvidenceRow[];
  source: "supabase" | "mock";
  error?: string;
}> {
  if (!hasSupabaseBrowserEnv()) {
    return {
      rows: mockEvidence(),
      source: "mock",
      error: "Supabase env vars are not configured.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence")
    .select(
      "id,evidence_code,title,verification_status,mime_type,drive_file_id,drive_folder_id,uploaded_by,uploaded_at,programmes(name),profiles!evidence_uploaded_by_fkey(email)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(25);

  if (error) {
    return {
      rows: mockEvidence(),
      source: "mock",
      error: error.message,
    };
  }

  if (!data?.length) {
    return {
      rows: mockEvidence(),
      source: "mock",
      error: "Supabase returned no evidence metadata yet.",
    };
  }

  return {
    rows: data.map(formatEvidence),
    source: "supabase",
  };
}

export async function getEvidenceNotes(evidenceId: string): Promise<EvidenceNote[]> {
  if (!hasSupabaseBrowserEnv()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_notes")
    .select("id,body,created_at,profiles:author_id(email)")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((row) => {
    const profileRel = (row as { profiles?: { email?: string | null } | { email?: string | null }[] | null })
      .profiles;
    const author = Array.isArray(profileRel) ? profileRel[0] : profileRel;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorEmail: author?.email || "Unknown author",
    };
  });
}

function formatEvidence(record: EvidenceRecord): EvidenceRow {
  const uploaderEmail = record.profiles?.[0]?.email;
  return {
    id: record.id,
    code: record.evidence_code,
    title: record.title,
    storage: "Google Drive",
    status: formatStatus(record.verification_status),
    rawStatus: record.verification_status,
    linkedRecord: record.programmes?.[0]?.name || "Programme link pending",
    uploadedBy: uploaderEmail || "Unknown uploader",
    fileType: humanizeMimeType(record.mime_type),
    folder: record.drive_folder_id
      ? `Drive folder ${record.drive_folder_id}`
      : "Folder cached after upload",
    blocker: blockerFromStatus(record.verification_status),
    driveFileId: record.drive_file_id,
    uploadedAt: record.uploaded_at,
  };
}

function formatStatus(value: string) {
  if (value === "in_review") return "In review";
  if (value === "consent_check") return "Consent check";
  if (value === "verified") return "Verified";
  return value;
}

function blockerFromStatus(status: string) {
  if (status === "verified") return "None";
  if (status === "consent_check") return "Consent confirmation required";
  return "Operational review pending";
}

function humanizeMimeType(mimeType: string | null) {
  if (!mimeType) return "Uploaded file";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Document";
  return mimeType;
}

function mockEvidence(): EvidenceRow[] {
  return evidenceRows.map(([code, title, storage, status, linkedRecord]) => ({
    id: null,
    code: String(code),
    title: String(title),
    storage: String(storage),
    status: String(status),
    rawStatus:
      String(status) === "Verified"
        ? "verified"
        : String(status) === "Consent check"
          ? "consent_check"
          : "in_review",
    linkedRecord: String(linkedRecord),
    uploadedBy: "adlaioog@gmail.com",
    fileType: "Uploaded file",
    folder: "Drive folder pending",
    blocker: status === "Verified" ? "None" : "Operational review pending",
    driveFileId: null,
    uploadedAt: null,
  }));
}
