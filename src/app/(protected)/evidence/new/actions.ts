"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateEvidenceState = {
  error?: string;
  fields?: {
    title?: string;
    evidence_code?: string;
    evidence_type?: string;
    programme_code?: string;
    verification_status?: string;
    drive_file_id?: string;
    drive_folder_id?: string;
    mime_type?: string;
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
    drive_file_id: String(formData.get("drive_file_id") ?? "").trim(),
    drive_folder_id: String(formData.get("drive_folder_id") ?? "").trim(),
    mime_type: String(formData.get("mime_type") ?? "").trim(),
  };

  if (!fields.title || !fields.evidence_type || !fields.programme_code || !fields.drive_file_id) {
    return {
      error: "Evidence title, linked programme, evidence type, and Google Drive file ID are required.",
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
    .select("id")
    .eq("programme_code", fields.programme_code)
    .maybeSingle();

  if (programmeError || !programme) {
    return {
      error: "The selected programme could not be resolved. Refresh the page and choose a valid programme.",
      fields,
    };
  }

  if (!fields.evidence_code) {
    fields.evidence_code = await generateEvidenceCode(supabase);
  }

  const { error } = await supabase.from("evidence").insert({
    evidence_code: fields.evidence_code,
    programme_id: programme.id,
    title: fields.title,
    evidence_type: fields.evidence_type,
    drive_file_id: fields.drive_file_id,
    drive_folder_id: fields.drive_folder_id || null,
    mime_type: fields.mime_type || null,
    verification_status: fields.verification_status,
    uploaded_by: user.id,
  });

  if (error) {
    return {
      error:
        error.message.includes("row-level security") || error.message.includes("permission denied")
          ? "Database write access is not enabled yet for evidence. Run the evidence write policy SQL, then try again."
          : error.message,
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
