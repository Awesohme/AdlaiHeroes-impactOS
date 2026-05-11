"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EDUCATION_SPONSORSHIP_STAGES } from "@/lib/programme-pipeline";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const programmeStatuses = new Set([
  "draft",
  "planned",
  "active",
  "monitoring",
  "completed",
  "at_risk",
]);

function mapRlsError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled. Run the latest SQL block in Supabase, then try again.";
  }
  if (message.includes("does not exist") || message.includes("relation \"public.")) {
    return "Required table is not live yet. Run the latest SQL block in Supabase, then refresh.";
  }
  return message;
}

export async function updateProgrammeStatusAction(
  programmeId: string,
  status: string,
): Promise<ActionResult> {
  if (!programmeStatuses.has(status)) return { ok: false, error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("programmes")
    .update({ status })
    .eq("id", programmeId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not update status.") };
  revalidatePath("/programmes");
  return { ok: true };
}

export async function archiveProgrammeAction(
  programmeId: string,
  payload: { programmeCode: string; confirmationCode: string; reason: string; confirmed: boolean },
): Promise<ActionResult> {
  if (!payload.confirmed) return { ok: false, error: "Confirm that you understand this archive action." };
  if (!payload.reason.trim()) return { ok: false, error: "Archive reason is required." };
  if (payload.confirmationCode.trim().toUpperCase() !== payload.programmeCode.trim().toUpperCase()) {
    return { ok: false, error: "Programme code confirmation does not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("programmes")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user.id,
      archive_reason: payload.reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", programmeId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not archive programme.") };
  revalidatePath("/programmes");
  return { ok: true };
}

export async function restoreProgrammeAction(programmeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("programmes")
    .update({
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programmeId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not restore programme.") };
  revalidatePath("/programmes");
  return { ok: true };
}

// ---------------- Milestones ----------------

export type MilestoneRow = {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  position: number;
};

export async function listMilestonesAction(programmeId: string): Promise<MilestoneRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_milestones")
    .select("id,title,due_date,done,position")
    .eq("programme_id", programmeId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function addMilestoneAction(
  programmeId: string,
  title: string,
  dueDate: string | null,
): Promise<ActionResult<MilestoneRow[]>> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("programme_milestones")
    .select("position")
    .eq("programme_id", programmeId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;
  const { error } = await supabase.from("programme_milestones").insert({
    programme_id: programmeId,
    title: trimmed,
    due_date: dueDate || null,
    position,
  });
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not add milestone.") };
  const milestones = await listMilestonesAction(programmeId);
  revalidatePath("/programmes");
  return { ok: true, data: milestones };
}

export async function toggleMilestoneAction(
  programmeId: string,
  milestoneId: string,
  done: boolean,
): Promise<ActionResult<MilestoneRow[]>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("programme_milestones")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", milestoneId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not update milestone.") };
  const milestones = await listMilestonesAction(programmeId);
  return { ok: true, data: milestones };
}

export async function deleteMilestoneAction(
  programmeId: string,
  milestoneId: string,
): Promise<ActionResult<MilestoneRow[]>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("programme_milestones")
    .delete()
    .eq("id", milestoneId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not delete milestone.") };
  const milestones = await listMilestonesAction(programmeId);
  return { ok: true, data: milestones };
}

// ---------------- Funds ----------------

export type FundsRow = {
  id: string;
  amount_ngn: number;
  source: string;
  contributed_on: string;
  note: string | null;
  created_at: string;
};

export async function listFundsAction(programmeId: string): Promise<FundsRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_funds")
    .select("id,amount_ngn,source,contributed_on,note,created_at")
    .eq("programme_id", programmeId)
    .order("contributed_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({ ...row, amount_ngn: Number(row.amount_ngn) }));
}

export async function addFundsEntryAction(
  programmeId: string,
  payload: { amount: string; source: string; contributedOn: string; note?: string },
): Promise<ActionResult<FundsRow[]>> {
  const amount = Number(String(payload.amount).replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a positive amount." };
  if (!payload.source.trim()) return { ok: false, error: "Source is required." };
  if (!payload.contributedOn) return { ok: false, error: "Date is required." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("programme_funds").insert({
    programme_id: programmeId,
    amount_ngn: amount,
    source: payload.source.trim(),
    contributed_on: payload.contributedOn,
    note: payload.note?.trim() || null,
    created_by: user?.id ?? null,
  });
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not save entry.") };
  const funds = await listFundsAction(programmeId);
  return { ok: true, data: funds };
}

// ---------------- Stages ----------------

export type StageRow = {
  id: string;
  key: string;
  label: string;
  position: number;
  is_terminal: boolean;
};

export async function listStagesAction(programmeId: string): Promise<StageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_stages")
    .select("id,key,label,position,is_terminal")
    .eq("programme_id", programmeId)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function addStageAction(
  programmeId: string,
  label: string,
): Promise<ActionResult<StageRow[]>> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Stage label is required." };
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!key) return { ok: false, error: "Use letters or numbers in the stage label." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("programme_stages")
    .select("position")
    .eq("programme_id", programmeId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;
  const { error } = await supabase.from("programme_stages").insert({
    programme_id: programmeId,
    key,
    label: trimmed,
    position,
  });
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not add stage.") };
  const stages = await listStagesAction(programmeId);
  return { ok: true, data: stages };
}

export async function moveStageAction(
  programmeId: string,
  stageId: string,
  direction: -1 | 1,
): Promise<ActionResult<StageRow[]>> {
  const stages = await listStagesAction(programmeId);
  const index = stages.findIndex((s) => s.id === stageId);
  if (index < 0) return { ok: false, error: "Stage not found." };
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= stages.length) return { ok: true, data: stages };
  const a = stages[index];
  const b = stages[swapIndex];
  const supabase = await createClient();
  const { error: err1 } = await supabase
    .from("programme_stages")
    .update({ position: b.position })
    .eq("id", a.id);
  if (err1) return { ok: false, error: mapRlsError(err1.message, "Could not reorder stages.") };
  const { error: err2 } = await supabase
    .from("programme_stages")
    .update({ position: a.position })
    .eq("id", b.id);
  if (err2) return { ok: false, error: mapRlsError(err2.message, "Could not reorder stages.") };
  const refreshed = await listStagesAction(programmeId);
  return { ok: true, data: refreshed };
}

export async function deleteStageAction(
  programmeId: string,
  stageId: string,
): Promise<ActionResult<StageRow[]>> {
  const supabase = await createClient();
  const { error } = await supabase.from("programme_stages").delete().eq("id", stageId);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not delete stage.") };
  const stages = await listStagesAction(programmeId);
  return { ok: true, data: stages };
}

export async function seedEducationStagesAction(
  programmeId: string,
): Promise<ActionResult<StageRow[]>> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("programme_stages")
    .select("id")
    .eq("programme_id", programmeId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: "Pipeline already has stages. Delete them first to reseed." };
  }
  const rows = EDUCATION_SPONSORSHIP_STAGES.map((stage, index) => ({
    programme_id: programmeId,
    key: stage.key,
    label: stage.label,
    position: index,
    is_terminal: stage.is_terminal,
  }));
  const { error } = await supabase.from("programme_stages").insert(rows);
  if (error) return { ok: false, error: mapRlsError(error.message, "Could not seed stages.") };
  const stages = await listStagesAction(programmeId);
  return { ok: true, data: stages };
}

// ---------------- Enrolments by stage ----------------

export type EnrolmentSummary = {
  enrolment_id: string;
  beneficiary_id: string;
  beneficiary_code: string;
  beneficiary_name: string;
  stage_id: string | null;
  stage_label: string | null;
  decision: string | null;
  scorecard_total: number | null;
  consent_received: boolean;
  consent_drive_file_id: string | null;
  consent_recorded_at: string | null;
  scorecard: {
    financial_need: number;
    academic_record: number;
    attendance_score: number;
    cbt_readiness: number;
    commitment: number;
  } | null;
};

export async function listEnrolmentsByProgrammeAction(
  programmeId: string,
): Promise<EnrolmentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrolments")
    .select(
      "id,stage_id,decision,beneficiaries(id,beneficiary_code,full_name,consent_received,consent_evidence_drive_file_id,consent_recorded_at),programme_stages:stage_id(label),enrolment_scorecards(financial_need,academic_record,attendance_score,cbt_readiness,commitment)",
    )
    .eq("programme_id", programmeId)
    .order("enrolled_at", { ascending: false });
  if (error || !data) return [];
  type BeneficiaryRel = {
    id: string;
    beneficiary_code: string;
    full_name: string;
    consent_received: boolean | null;
    consent_evidence_drive_file_id: string | null;
    consent_recorded_at: string | null;
  };
  type StageRel = { label: string };
  type ScoreRel = {
    financial_need: number;
    academic_record: number;
    attendance_score: number;
    cbt_readiness: number;
    commitment: number;
  };
  type RowShape = {
    id: string;
    stage_id: string | null;
    decision: string | null;
    beneficiaries: BeneficiaryRel | BeneficiaryRel[] | null;
    programme_stages?: StageRel | StageRel[] | null;
    enrolment_scorecards?: ScoreRel | ScoreRel[] | null;
  };
  return (data as unknown as RowShape[]).map((row) => {
    const beneficiary = Array.isArray(row.beneficiaries)
      ? row.beneficiaries[0]
      : row.beneficiaries;
    const stageRel = row.programme_stages;
    const stage = Array.isArray(stageRel) ? stageRel[0] : stageRel;
    const score = Array.isArray(row.enrolment_scorecards)
      ? row.enrolment_scorecards[0]
      : row.enrolment_scorecards ?? null;
    const total = score
      ? score.financial_need +
        score.academic_record +
        score.attendance_score +
        score.cbt_readiness +
        score.commitment
      : null;
    return {
      enrolment_id: row.id,
      beneficiary_id: beneficiary?.id ?? "",
      beneficiary_code: beneficiary?.beneficiary_code ?? "—",
      beneficiary_name: beneficiary?.full_name ?? "Unknown",
      stage_id: row.stage_id ?? null,
      stage_label: stage?.label ?? null,
      decision: row.decision ?? null,
      scorecard_total: total,
      consent_received: beneficiary?.consent_received ?? false,
      consent_drive_file_id: beneficiary?.consent_evidence_drive_file_id ?? null,
      consent_recorded_at: beneficiary?.consent_recorded_at ?? null,
      scorecard: score
        ? {
            financial_need: score.financial_need,
            academic_record: score.academic_record,
            attendance_score: score.attendance_score,
            cbt_readiness: score.cbt_readiness,
            commitment: score.commitment,
          }
        : null,
    };
  });
}
