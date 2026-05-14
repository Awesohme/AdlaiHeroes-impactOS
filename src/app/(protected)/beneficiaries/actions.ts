"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadBeneficiaryPhotoToDrive,
  uploadConsentFileToDrive,
  uploadEnrolmentAssetToDrive,
} from "@/lib/google-drive/server";
import { generateEvidenceCode } from "@/lib/evidence-codes";

const validSafeguarding = new Set(["none", "reviewed", "follow_up_needed"]);
const validImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProfileImageBytes = 8 * 1024 * 1024;

export type BeneficiaryNote = {
  id: string;
  body: string;
  createdAt: string;
  authorEmail: string;
  programmeName: string | null;
};

export async function listBeneficiaryNotesAction(
  beneficiaryId: string,
): Promise<BeneficiaryNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiary_notes")
    .select(
      "id,body,created_at,profiles:author_id(email),programmes:programme_id(name)",
    )
    .eq("beneficiary_id", beneficiaryId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row) => {
    const profileRel = (row as { profiles?: { email?: string | null } | { email?: string | null }[] | null })
      .profiles;
    const author = Array.isArray(profileRel) ? profileRel[0] : profileRel;
    const programmeRel = (row as { programmes?: { name?: string | null } | { name?: string | null }[] | null })
      .programmes;
    const programme = Array.isArray(programmeRel) ? programmeRel[0] : programmeRel;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorEmail: author?.email || "Unknown author",
      programmeName: programme?.name ?? null,
    };
  });
}

export async function addBeneficiaryNoteAction(
  beneficiaryId: string,
  body: string,
  enrolmentId: string | null,
  programmeId: string | null,
): Promise<ActionResult<BeneficiaryNote[]>> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  if (trimmed.length > 2000) return { ok: false, error: "Note must be under 2000 characters." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("beneficiary_notes").insert({
    beneficiary_id: beneficiaryId,
    enrolment_id: enrolmentId,
    programme_id: programmeId,
    author_id: user.id,
    body: trimmed,
  });
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save note.") };
  const notes = await listBeneficiaryNotesAction(beneficiaryId);
  return { ok: true, data: notes };
}

export async function setBeneficiarySafeguardingAction(
  beneficiaryId: string,
  flag: string,
): Promise<ActionResult> {
  if (!validSafeguarding.has(flag)) return { ok: false, error: "Invalid safeguarding value." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("beneficiaries")
    .update({ safeguarding_flag: flag, updated_at: new Date().toISOString() })
    .eq("id", beneficiaryId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not update safeguarding.") };
  revalidatePath("/beneficiaries");
  return { ok: true };
}

export async function uploadBeneficiaryProfileImageAction(
  beneficiaryId: string,
  formData: FormData,
): Promise<ActionResult<{ driveFileId: string; uploadedAt: string }>> {
  const profileImage = formData.get("profile_image");
  if (!(profileImage instanceof File) || profileImage.size === 0) {
    return { ok: false, error: "Pick a profile image to upload." };
  }
  if (!validImageTypes.has(profileImage.type)) {
    return { ok: false, error: "Profile image must be JPG, PNG, or WebP." };
  }
  if (profileImage.size > maxProfileImageBytes) {
    return { ok: false, error: "Profile image must be 8MB or smaller." };
  }

  const supabase = await createClient();
  const { data: beneficiary } = await supabase
    .from("beneficiaries")
    .select("id,beneficiary_code,full_name")
    .eq("id", beneficiaryId)
    .maybeSingle();
  if (!beneficiary) return { ok: false, error: "Beneficiary not found." };

  let uploaded: Awaited<ReturnType<typeof uploadBeneficiaryPhotoToDrive>>;
  try {
    uploaded = await uploadBeneficiaryPhotoToDrive({
      file: profileImage,
      beneficiaryCode: beneficiary.beneficiary_code,
      beneficiaryName: beneficiary.full_name,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drive upload failed.",
    };
  }

  const uploadedAt = new Date().toISOString();
  const { error } = await supabase
    .from("beneficiaries")
    .update({
      profile_image_drive_file_id: uploaded.fileId,
      profile_image_folder_id: uploaded.driveFolderId,
      profile_image_mime_type: uploaded.mimeType,
      profile_image_size_bytes: uploaded.fileSizeBytes,
      profile_image_uploaded_at: uploadedAt,
      updated_at: uploadedAt,
    })
    .eq("id", beneficiaryId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save profile image.") };

  revalidatePath("/beneficiaries");
  revalidatePath("/pipeline");
  return { ok: true, data: { driveFileId: uploaded.fileId, uploadedAt } };
}

export async function uploadConsentEvidenceAction(
  beneficiaryId: string,
  formData: FormData,
): Promise<ActionResult<{ driveFileId: string; warning?: string }>> {
  const supabase = await createClient();
  const consentFile = formData.get("consent_file");
  if (!(consentFile instanceof File) || consentFile.size === 0) {
    return { ok: false, error: "Pick a consent file to upload." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  // Load beneficiary name (used in evidence title)
  const { data: beneficiaryRow } = await supabase
    .from("beneficiaries")
    .select("id, full_name")
    .eq("id", beneficiaryId)
    .maybeSingle();
  if (!beneficiaryRow) return { ok: false, error: "Beneficiary not found." };

  // Pick the most recent enrolment for Drive routing + evidence linkage
  const { data: enrolments } = await supabase
    .from("enrolments")
    .select("id,programmes(id,programme_code,name,drive_folder_id)")
    .eq("beneficiary_id", beneficiaryId)
    .order("enrolled_at", { ascending: false })
    .limit(1);
  const enrolment = enrolments?.[0];
  const programmeRel = enrolment?.programmes;
  const programme = Array.isArray(programmeRel) ? programmeRel[0] : programmeRel;
  if (!programme || !enrolment) {
    return {
      ok: false,
      error: "Enrol this beneficiary in a programme before uploading a consent file.",
    };
  }

  let uploaded: Awaited<ReturnType<typeof uploadConsentFileToDrive>>;
  try {
    uploaded = await uploadConsentFileToDrive({
      file: consentFile,
      programme: programme as {
        id: string;
        programme_code: string;
        name: string;
        drive_folder_id: string | null;
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drive upload failed.",
    };
  }

  // Insert evidence row (verified by default for consent docs)
  let evidenceWarning: string | undefined;
  try {
    const evidenceCode = await generateEvidenceCode(supabase);
    const { error: evidenceError } = await supabase.from("evidence").insert({
      evidence_code: evidenceCode,
      programme_id: programme.id,
      beneficiary_id: beneficiaryId,
      title: `Consent — ${beneficiaryRow.full_name}`,
      evidence_type: "Consent",
      drive_file_id: uploaded.fileId,
      drive_folder_id: uploaded.driveFolderId,
      mime_type: uploaded.mimeType || null,
      file_size_bytes: uploaded.fileSizeBytes || null,
      verification_status: "verified",
      uploaded_by: user.id,
    });
    if (evidenceError) {
      console.error("Consent uploaded but evidence row insert failed", {
        beneficiaryId,
        driveFileId: uploaded.fileId,
        error: evidenceError.message,
      });
      evidenceWarning =
        "Consent saved, but couldn't index it in the evidence library. Check evidence write policy.";
    }
  } catch (error) {
    console.error("Evidence indexing failed for consent upload", error);
    evidenceWarning =
      "Consent saved, but couldn't index it in the evidence library.";
  }

  // Update beneficiary's consent fields
  const { error: updateError } = await supabase
    .from("beneficiaries")
    .update({
      consent_received: true,
      consent_evidence_drive_file_id: uploaded.fileId,
      consent_recorded_at: new Date().toISOString(),
      consent_status: "consent_captured",
      updated_at: new Date().toISOString(),
    })
    .eq("id", beneficiaryId);
  if (updateError) {
    return { ok: false, error: mapDbError(updateError.message, "Could not save consent.") };
  }

  revalidatePath("/beneficiaries");
  revalidatePath("/evidence");
  return { ok: true, data: { driveFileId: uploaded.fileId, warning: evidenceWarning } };
}

export async function clearBeneficiaryConsentAction(
  beneficiaryId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("beneficiaries")
    .update({
      consent_received: false,
      consent_evidence_drive_file_id: null,
      consent_recorded_at: null,
      consent_status: "not_recorded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", beneficiaryId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not clear consent.") };
  revalidatePath("/beneficiaries");
  return { ok: true };
}

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const validDecisions = new Set(["approved", "deferred", "declined", ""]);

function mapDbError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled. Run the latest SQL block in Supabase.";
  }
  if (message.includes("does not exist") || message.includes("relation \"public.")) {
    return "Required table is not live yet. Run the latest SQL block in Supabase.";
  }
  return message;
}

export async function listProgrammeStagesAction(
  programmeId: string,
): Promise<Array<{ id: string; label: string; position: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_stages")
    .select("id,label,position")
    .eq("programme_id", programmeId)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function moveEnrolmentStageAction(
  enrolmentId: string,
  stageId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  // Load enrolment + its programme + current stage position.
  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("programme_id,stage_id")
    .eq("id", enrolmentId)
    .maybeSingle();
  if (!enrolment) return { ok: false, error: "Enrolment not found." };

  let currentPosition = -1;
  if (enrolment.stage_id) {
    const { data: current } = await supabase
      .from("programme_stages")
      .select("position")
      .eq("id", enrolment.stage_id)
      .maybeSingle();
    if (current) currentPosition = Number(current.position ?? -1);
  }

  let targetPosition = -1;
  let targetLabel = "Unstaged";
  if (stageId) {
    const { data: target } = await supabase
      .from("programme_stages")
      .select("position,label")
      .eq("id", stageId)
      .maybeSingle();
    if (target) {
      targetPosition = Number(target.position ?? -1);
      targetLabel = target.label ?? targetLabel;
    }
  }

  // Forward-only gate: backward / sideways moves bypass required-field checks.
  const isForward = targetPosition > currentPosition;
  if (isForward && enrolment.programme_id) {
    const [{ data: requiredFieldsRaw }, { data: stagesRaw }, { data: valuesRaw }] = await Promise.all([
      supabase
        .from("programme_data_fields")
        .select("field_key,label,required,required_from_stage_key,enabled")
        .eq("programme_id", enrolment.programme_id)
        .eq("required", true)
        .neq("enabled", false),
      supabase
        .from("programme_stages")
        .select("key,position")
        .eq("programme_id", enrolment.programme_id),
      supabase
        .from("enrolment_field_values")
        .select("field_key,value")
        .eq("enrolment_id", enrolmentId),
    ]);

    const stagePositionByKey = new Map<string, number>();
    for (const s of stagesRaw ?? []) {
      if (s.key) stagePositionByKey.set(s.key, Number(s.position ?? 0));
    }
    const valueMap = new Map<string, string | null>();
    for (const row of valuesRaw ?? []) {
      valueMap.set(row.field_key, row.value);
    }

    const missing: string[] = [];
    for (const field of requiredFieldsRaw ?? []) {
      const threshold = field.required_from_stage_key
        ? stagePositionByKey.get(field.required_from_stage_key) ?? 0
        : 0;
      if (targetPosition < threshold) continue;
      const v = valueMap.get(field.field_key);
      if (!v || !String(v).trim()) missing.push(field.label);
    }
    if (missing.length) {
      return {
        ok: false,
        error: `Required fields missing: ${missing.join(", ")}. Fill them before moving to ${targetLabel}.`,
      };
    }
  }

  const { error } = await supabase
    .from("enrolments")
    .update({ stage_id: stageId })
    .eq("id", enrolmentId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not move stage.") };
  revalidatePath("/beneficiaries");
  revalidatePath("/pipeline");
  return { ok: true };
}

export async function setEnrolmentDecisionAction(
  enrolmentId: string,
  decision: string,
  reason: string,
): Promise<ActionResult> {
  if (!validDecisions.has(decision)) return { ok: false, error: "Invalid decision." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const payload: Record<string, string | null> = {
    decision: decision || null,
    decision_reason: reason.trim() || null,
    decided_at: decision ? new Date().toISOString() : null,
    decided_by: decision ? user?.id ?? null : null,
  };
  const { error } = await supabase.from("enrolments").update(payload).eq("id", enrolmentId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save decision.") };
  revalidatePath("/beneficiaries");
  return { ok: true };
}

export async function enrolBeneficiaryAction(
  beneficiaryId: string,
  programmeId: string,
  stageId: string | null,
): Promise<ActionResult<{ enrolmentId: string }>> {
  if (!beneficiaryId || !programmeId) {
    return { ok: false, error: "Beneficiary and programme are required." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrolments")
    .insert({
      beneficiary_id: beneficiaryId,
      programme_id: programmeId,
      stage_id: stageId,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "This beneficiary is already enrolled in that programme." };
    }
    return { ok: false, error: mapDbError(error?.message, "Could not enrol.") };
  }
  revalidatePath("/beneficiaries");
  return { ok: true, data: { enrolmentId: data.id } };
}

export type EnrolmentFieldRow = {
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  required_from_stage_key: string | null;
  position: number;
  value: string | null;
  archived: boolean;
  options: string[];
};

export async function listEnrolmentFieldsAction(
  enrolmentId: string,
): Promise<EnrolmentFieldRow[]> {
  const supabase = await createClient();
  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("programme_id")
    .eq("id", enrolmentId)
    .maybeSingle();
  if (!enrolment?.programme_id) return [];

  const [{ data: fieldsRaw }, { data: valuesRaw }] = await Promise.all([
    supabase
      .from("programme_data_fields")
      .select(
        "field_key,label,field_type,required,required_from_stage_key,position,enabled,options",
      )
      .eq("programme_id", enrolment.programme_id)
      .order("position", { ascending: true }),
    supabase
      .from("enrolment_field_values")
      .select("field_key,value")
      .eq("enrolment_id", enrolmentId),
  ]);
  const valueMap = new Map<string, string | null>();
  for (const row of valuesRaw ?? []) {
    valueMap.set(row.field_key, row.value);
  }
  // Include disabled (archived) fields only when the enrolment has a value for them.
  const fields = (fieldsRaw ?? []).filter(
    (f) => f.enabled !== false || valueMap.has(f.field_key),
  );
  return fields.map((field) => ({
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    required: Boolean(field.required),
    required_from_stage_key:
      typeof field.required_from_stage_key === "string"
        ? field.required_from_stage_key
        : null,
    position: Number(field.position ?? 0),
    value: valueMap.get(field.field_key) ?? null,
    archived: field.enabled === false,
    options: Array.isArray((field as { options?: unknown }).options)
      ? ((field as { options: unknown[] }).options.map((o) => String(o)) as string[])
      : [],
  }));
}

export async function saveEnrolmentFieldValueAction(
  enrolmentId: string,
  fieldKey: string,
  value: string,
): Promise<ActionResult> {
  if (!enrolmentId || !fieldKey) return { ok: false, error: "Missing enrolment or field." };
  const supabase = await createClient();
  const trimmed = value.trim();
  if (!trimmed) {
    const { error } = await supabase
      .from("enrolment_field_values")
      .delete()
      .eq("enrolment_id", enrolmentId)
      .eq("field_key", fieldKey);
    if (error) return { ok: false, error: mapDbError(error.message, "Could not clear field.") };
    revalidatePath("/beneficiaries");
    revalidatePath("/pipeline");
    return { ok: true };
  }
  const { error } = await supabase
    .from("enrolment_field_values")
    .upsert(
      {
        enrolment_id: enrolmentId,
        field_key: fieldKey,
        value: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "enrolment_id,field_key" },
    );
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save field.") };
  revalidatePath("/beneficiaries");
  revalidatePath("/pipeline");
  return { ok: true };
}

async function loadBeneficiaryForEnrolment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrolmentId: string,
) {
  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("beneficiary_id")
    .eq("id", enrolmentId)
    .maybeSingle();
  if (!enrolment?.beneficiary_id) return null;
  const { data: beneficiary } = await supabase
    .from("beneficiaries")
    .select("beneficiary_code,full_name")
    .eq("id", enrolment.beneficiary_id)
    .maybeSingle();
  return beneficiary;
}

const validImageMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAssetBytes = 8 * 1024 * 1024;

export async function uploadEnrolmentImageFieldAction(
  enrolmentId: string,
  fieldKey: string,
  formData: FormData,
): Promise<ActionResult<{ driveFileId: string }>> {
  const file = formData.get("field_image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image to upload." };
  }
  if (!validImageMimes.has(file.type)) {
    return { ok: false, error: "Image must be JPG, PNG, or WebP." };
  }
  if (file.size > maxAssetBytes) {
    return { ok: false, error: "Image must be 8 MB or smaller." };
  }
  const supabase = await createClient();
  const beneficiary = await loadBeneficiaryForEnrolment(supabase, enrolmentId);
  if (!beneficiary) return { ok: false, error: "Beneficiary not found." };
  try {
    const uploaded = await uploadEnrolmentAssetToDrive({
      file,
      beneficiaryCode: beneficiary.beneficiary_code,
      beneficiaryName: beneficiary.full_name,
      fieldKey,
      subfolder: "Field Images",
    });
    const { error } = await supabase
      .from("enrolment_field_values")
      .upsert(
        {
          enrolment_id: enrolmentId,
          field_key: fieldKey,
          value: `drive:${uploaded.fileId}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "enrolment_id,field_key" },
      );
    if (error) return { ok: false, error: mapDbError(error.message, "Could not save image.") };
    revalidatePath("/beneficiaries");
    revalidatePath("/pipeline");
    return { ok: true, data: { driveFileId: uploaded.fileId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drive upload failed.",
    };
  }
}

export async function uploadEnrolmentSignatureAction(
  enrolmentId: string,
  fieldKey: string,
  dataUrl: string,
): Promise<ActionResult<{ driveFileId: string }>> {
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return { ok: false, error: "Sign on the canvas first." };
  }
  const base64 = dataUrl.slice("data:image/png;base64,".length);
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  } catch {
    return { ok: false, error: "Could not decode the signature." };
  }
  if (bytes.byteLength === 0) return { ok: false, error: "Signature is empty." };
  if (bytes.byteLength > maxAssetBytes) {
    return { ok: false, error: "Signature image too large." };
  }
  const blob = new Blob([bytes as BlobPart], { type: "image/png" });
  const file = new File([blob], `${fieldKey}-${Date.now()}.png`, { type: "image/png" });

  const supabase = await createClient();
  const beneficiary = await loadBeneficiaryForEnrolment(supabase, enrolmentId);
  if (!beneficiary) return { ok: false, error: "Beneficiary not found." };
  try {
    const uploaded = await uploadEnrolmentAssetToDrive({
      file,
      beneficiaryCode: beneficiary.beneficiary_code,
      beneficiaryName: beneficiary.full_name,
      fieldKey,
      subfolder: "Signatures",
    });
    const { error } = await supabase
      .from("enrolment_field_values")
      .upsert(
        {
          enrolment_id: enrolmentId,
          field_key: fieldKey,
          value: `drive:${uploaded.fileId}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "enrolment_id,field_key" },
      );
    if (error) return { ok: false, error: mapDbError(error.message, "Could not save signature.") };
    revalidatePath("/beneficiaries");
    revalidatePath("/pipeline");
    return { ok: true, data: { driveFileId: uploaded.fileId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drive upload failed.",
    };
  }
}

export async function upsertScorecardAction(
  enrolmentId: string,
  scores: {
    financial_need: number;
    academic_record: number;
    attendance_score: number;
    cbt_readiness: number;
    commitment: number;
    notes: string;
  },
): Promise<ActionResult> {
  const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  const payload = {
    enrolment_id: enrolmentId,
    financial_need: clamp(scores.financial_need, 25),
    academic_record: clamp(scores.academic_record, 35),
    attendance_score: clamp(scores.attendance_score, 15),
    cbt_readiness: clamp(scores.cbt_readiness, 15),
    commitment: clamp(scores.commitment, 10),
    notes: scores.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrolment_scorecards")
    .upsert(payload, { onConflict: "enrolment_id" });
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save scorecard.") };
  revalidatePath("/beneficiaries");
  return { ok: true };
}
