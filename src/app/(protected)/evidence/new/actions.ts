"use server";

import { redirect } from "next/navigation";
import { uploadEvidenceFileToDrive } from "@/lib/google-drive/server";
import { createClient } from "@/lib/supabase/server";

export type CreateEvidenceState = {
  error?: string;
  fields?: {
    title?: string;
    evidence_code?: string;
    evidence_type?: string;
    programme_code?: string;
    verification_status?: string;
    file_name?: string;
  };
};

const validStatuses = new Set(["in_review", "verified", "consent_check"]);

export async function createEvidenceAction(
  _previousState: CreateEvidenceState,
  formData: FormData,
): Promise<CreateEvidenceState> {
  const fields = {
    title: String(formData.get("title") ?? "").trim(),
    evidence_code: String(formData.get("evidence_code") ?? "").trim().toUpperCase(),
    evidence_type: String(formData.get("evidence_type") ?? "").trim(),
    programme_code: String(formData.get("programme_code") ?? "").trim(),
    verification_status: String(formData.get("verification_status") ?? "in_review").trim().toLowerCase(),
    file_name: String((formData.get("evidence_file") as File | null)?.name ?? "").trim(),
  };
  const evidenceFile = formData.get("evidence_file");

  if (!fields.title || !fields.evidence_type || !fields.programme_code || !(evidenceFile instanceof File) || !evidenceFile.size) {
    return {
      error: "Evidence title, linked programme, evidence type, and a file upload are required.",
      fields,
    };
  }

  if (!validStatuses.has(fields.verification_status)) {
    return {
      error: "Choose a valid verification status.",
      fields,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your session expired. Sign in again before uploading evidence.",
      fields,
    };
  }

  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id,programme_code,name,drive_folder_id")
    .eq("programme_code", fields.programme_code)
    .maybeSingle();

  if (programmeError?.message.includes("drive_folder_id")) {
    return {
      error: "The programme Drive folder cache column is not live yet. Run supabase/programmes-drive-folder-column.sql, then try again.",
      fields,
    };
  }

  if (programmeError || !programme) {
    return {
      error: "The selected programme could not be resolved. Refresh the page and choose a valid programme.",
      fields,
    };
  }

  if (!fields.evidence_code) {
    fields.evidence_code = await generateEvidenceCode(supabase);
  }

  let uploadedFile;

  try {
    uploadedFile = await uploadEvidenceFileToDrive({
      file: evidenceFile,
      evidenceType: fields.evidence_type,
      programme,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Google Drive upload failed.",
      fields,
    };
  }

  if (!programme.drive_folder_id && uploadedFile.programmeFolderId) {
    const { error: cacheError } = await supabase
      .from("programmes")
      .update({ drive_folder_id: uploadedFile.programmeFolderId })
      .eq("id", programme.id);

    if (cacheError) {
      console.error("Failed to cache programme drive folder", {
        programmeId: programme.id,
        programmeCode: programme.programme_code,
        driveFolderId: uploadedFile.programmeFolderId,
        error: cacheError.message,
      });
    }
  }

  const { error } = await supabase.from("evidence").insert({
    evidence_code: fields.evidence_code,
    programme_id: programme.id,
    title: fields.title,
    evidence_type: fields.evidence_type,
    drive_file_id: uploadedFile.fileId,
    drive_folder_id: uploadedFile.driveFolderId,
    mime_type: uploadedFile.mimeType || null,
    file_size_bytes: uploadedFile.fileSizeBytes || null,
    verification_status: fields.verification_status,
    uploaded_by: user.id,
  });

  if (error) {
    console.error("Evidence upload partially succeeded but metadata insert failed", {
      evidenceCode: fields.evidence_code,
      programmeCode: programme.programme_code,
      driveFileId: uploadedFile.fileId,
      driveFolderId: uploadedFile.driveFolderId,
      error: error.message,
    });

    return {
      error:
        error.message.includes("row-level security") || error.message.includes("permission denied")
          ? "Database write access is not enabled yet for evidence. Run the evidence write policy SQL, then try again."
          : `Drive upload succeeded, but saving the evidence record failed. Please note this file may need cleanup: ${uploadedFile.fileName}.`,
      fields,
    };
  }

  redirect("/evidence?created=1");
}

async function generateEvidenceCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  const year = new Date().getFullYear();
  const prefix = `EVD-${year}-`;

  const { data } = await supabase
    .from("evidence")
    .select("evidence_code")
    .ilike("evidence_code", `${prefix}%`)
    .order("evidence_code", { ascending: false })
    .limit(50);

  const highest = (data ?? []).reduce((max, row) => {
    const match = row.evidence_code.match(/(\d{4})$/);
    const current = match ? Number(match[1]) : 0;
    return current > max ? current : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}
