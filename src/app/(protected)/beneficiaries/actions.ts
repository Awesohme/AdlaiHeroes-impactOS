"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
