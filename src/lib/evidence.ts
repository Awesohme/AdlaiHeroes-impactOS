import { evidenceRows } from "@/lib/sample-records";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type EvidenceRow = {
  code: string;
  title: string;
  storage: string;
  status: string;
  linkedRecord: string;
  uploadedBy: string;
  fileType: string;
  folder: string;
  blocker: string;
};

type EvidenceRecord = {
  evidence_code: string;
  title: string;
  verification_status: string;
  mime_type: string | null;
  drive_folder_id: string | null;
  uploaded_by: string | null;
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
    .select("evidence_code,title,verification_status,mime_type,drive_folder_id,uploaded_by,programmes(name),profiles!evidence_uploaded_by_fkey(email)")
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

function formatEvidence(record: EvidenceRecord): EvidenceRow {
  return {
    code: record.evidence_code,
    title: record.title,
    storage: "Google Drive",
    status: formatStatus(record.verification_status),
    linkedRecord: record.programmes?.[0]?.name || "Programme link pending",
    uploadedBy: record.profiles?.[0]?.email || record.uploaded_by || "Unknown uploader",
    fileType: humanizeMimeType(record.mime_type),
    folder: record.drive_folder_id ? `Drive folder ${record.drive_folder_id}` : "Folder cached after upload",
    blocker: blockerFromStatus(record.verification_status),
  };
}

function formatStatus(value: string) {
  if (value === "in_review") {
    return "In review";
  }

  if (value === "consent_check") {
    return "Consent check";
  }

  if (value === "verified") {
    return "Verified";
  }

  return value;
}

function blockerFromStatus(status: string) {
  if (status === "verified") {
    return "None";
  }

  if (status === "consent_check") {
    return "Consent confirmation required";
  }

  return "Operational review pending";
}

function humanizeMimeType(mimeType: string | null) {
  if (!mimeType) {
    return "Uploaded file";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType.startsWith("image/")) {
    return "Image";
  }

  if (mimeType.startsWith("video/")) {
    return "Video";
  }

  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "Spreadsheet";
  }

  if (mimeType.includes("word") || mimeType.includes("document")) {
    return "Document";
  }

  return mimeType;
}

function mockEvidence(): EvidenceRow[] {
  return evidenceRows.map(([code, title, storage, status, linkedRecord]) => ({
    code: String(code),
    title: String(title),
    storage: String(storage),
    status: String(status),
    linkedRecord: String(linkedRecord),
    uploadedBy: "adlaioog@gmail.com",
    fileType: "Uploaded file",
    folder: "Drive folder pending",
    blocker: status === "Verified" ? "None" : "Operational review pending",
  }));
}
