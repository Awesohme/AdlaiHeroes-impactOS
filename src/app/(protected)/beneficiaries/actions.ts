"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadConsentFileToDrive } from "@/lib/google-drive/server";

const validSafeguarding = new Set(["none", "reviewed", "follow_up_needed"]);

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

export async function setBeneficiaryConsentAction(
  beneficiaryId: string,
  received: boolean,
  formData: FormData | null,
): Promise<ActionResult<{ driveFileId: string | null }>> {
  const supabase = await createClient();
  if (!received) {
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
    return { ok: true, data: { driveFileId: null } };
  }

  const consentFile = formData?.get("consent_file");
  const hasFile = consentFile instanceof File && consentFile.size > 0;

  // Pick the most recent enrolment's programme for Drive routing
  const { data: enrolments } = await supabase
    .from("enrolments")
    .select("programmes(id,programme_code,name,drive_folder_id)")
    .eq("beneficiary_id", beneficiaryId)
    .order("enrolled_at", { ascending: false })
    .limit(1);
  const programmeRel = enrolments?.[0]?.programmes;
  const programme = Array.isArray(programmeRel) ? programmeRel[0] : programmeRel;

  let driveFileId: string | null = null;
  if (hasFile) {
    if (!programme) {
      return {
        ok: false,
        error: "Enrol this beneficiary in a programme before uploading a consent file.",
      };
    }
    try {
      const uploaded = await uploadConsentFileToDrive({
        file: consentFile as File,
        programme: programme as {
          id: string;
          programme_code: string;
          name: string;
          drive_folder_id: string | null;
        },
      });
      driveFileId = uploaded.fileId;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Drive upload failed.",
      };
    }
  }

  const { error } = await supabase
    .from("beneficiaries")
    .update({
      consent_received: true,
      consent_evidence_drive_file_id: driveFileId,
      consent_recorded_at: new Date().toISOString(),
      consent_status: "consent_captured",
      updated_at: new Date().toISOString(),
    })
    .eq("id", beneficiaryId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not save consent.") };
  revalidatePath("/beneficiaries");
  return { ok: true, data: { driveFileId } };
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
  const { error } = await supabase
    .from("enrolments")
    .update({ stage_id: stageId })
    .eq("id", enrolmentId);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not move stage.") };
  revalidatePath("/beneficiaries");
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
