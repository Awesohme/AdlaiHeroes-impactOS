import { hasSupabaseBrowserEnv } from "@/lib/env";
import type { ProgrammeModuleKey } from "@/lib/programme-config";
import type { ProgrammeRow } from "@/lib/programmes";
import { createClient } from "@/lib/supabase/server";
import { TERMINAL_STAGE_LABELS, usesEducationScorecard } from "@/lib/programme-pipeline";

export function isEnrolmentActive(row: {
  enrolment_id: string | null;
  current_status: string;
  stage_label: string | null;
}) {
  if (!row.enrolment_id) return false;
  if (row.current_status !== "active") return false;
  if (row.stage_label && TERMINAL_STAGE_LABELS.has(row.stage_label)) return false;
  return true;
}

export type BeneficiaryRow = {
  id: string | null;
  enrolment_id: string | null;
  beneficiary_code: string;
  full_name: string;
  programme_id: string | null;
  programme_name: string;
  programme_code?: string;
  programme_pipeline_template_key: string | null;
  programme_modules: ProgrammeModuleKey[];
  community: string;
  state: string;
  guardian_name: string;
  guardian_phone: string;
  consent_status: string;
  safeguarding_flag: string;
  current_status: string;
  last_activity: string;
  risk_flag: string;
  highlights: string[];
  stage_id: string | null;
  stage_label: string | null;
  decision: string | null;
  decision_reason: string | null;
  scorecard: {
    financial_need: number;
    academic_record: number;
    attendance_score: number;
    cbt_readiness: number;
    commitment: number;
    notes: string | null;
  } | null;
  consent_received: boolean;
  consent_evidence_drive_file_id: string | null;
  consent_recorded_at: string | null;
  profile_image_drive_file_id: string | null;
  profile_image_folder_id: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
  profile_image_uploaded_at: string | null;
};

type BeneficiaryRecord = {
  id: string;
  beneficiary_code: string;
  full_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  community: string | null;
  state: string | null;
  consent_status: string;
  safeguarding_flag: string;
  consent_received: boolean | null;
  consent_evidence_drive_file_id: string | null;
  consent_recorded_at: string | null;
  profile_image_drive_file_id: string | null;
  profile_image_folder_id: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
  profile_image_uploaded_at: string | null;
};

type ProgrammeRel = {
  id: string;
  name: string;
  programme_code: string;
  pipeline_template_key: string | null;
  enabled_modules: ProgrammeModuleKey[] | null;
};

type StageRel = { id: string; label: string };

type ScorecardRel = {
  financial_need: number;
  academic_record: number;
  attendance_score: number;
  cbt_readiness: number;
  commitment: number;
  notes: string | null;
};

type EnrolmentRecord = {
  id: string;
  beneficiary_id: string;
  status: string;
  stage_id: string | null;
  decision: string | null;
  decision_reason: string | null;
  programmes: ProgrammeRel | ProgrammeRel[] | null;
  programme_stages?: StageRel | StageRel[] | null;
  enrolment_scorecards?: ScorecardRel | ScorecardRel[] | null;
};

export async function getBeneficiaries(programmes: ProgrammeRow[] = []) {
  if (!hasSupabaseBrowserEnv()) {
    return {
      rows: buildMockBeneficiaries(programmes),
      source: "mock" as const,
      error: "Supabase env vars are not configured.",
    };
  }

  const supabase = await createClient();

  const [{ data: beneficiaries, error: beneficiaryError }, { data: enrolments, error: enrolmentError }] =
    await Promise.all([
      supabase
        .from("beneficiaries")
        .select(
          "id,beneficiary_code,full_name,guardian_name,guardian_phone,community,state,consent_status,safeguarding_flag,consent_received,consent_evidence_drive_file_id,consent_recorded_at,profile_image_drive_file_id,profile_image_folder_id,profile_image_mime_type,profile_image_size_bytes,profile_image_uploaded_at",
        )
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("enrolments")
        .select(
          "id,beneficiary_id,status,stage_id,decision,decision_reason,programmes(id,name,programme_code,pipeline_template_key,enabled_modules),programme_stages:stage_id(id,label),enrolment_scorecards(financial_need,academic_record,attendance_score,cbt_readiness,commitment,notes)",
        )
        .order("enrolled_at", { ascending: false })
        .limit(80),
    ]);

  if (beneficiaryError || enrolmentError) {
    return {
      rows: buildMockBeneficiaries(programmes),
      source: "mock" as const,
      error: beneficiaryError?.message ?? enrolmentError?.message ?? "Beneficiary records could not be loaded.",
    };
  }

  if (!beneficiaries?.length) {
    return {
      rows: buildMockBeneficiaries(programmes),
      source: "mock" as const,
      error: "Supabase returned no beneficiary rows yet.",
    };
  }

  const enrolmentMap = new Map<string, EnrolmentRecord>();

  (enrolments ?? []).forEach((enrolment) => {
    if (!enrolmentMap.has(enrolment.beneficiary_id)) {
      enrolmentMap.set(enrolment.beneficiary_id, enrolment as EnrolmentRecord);
    }
  });

  return {
    rows: beneficiaries.map((beneficiary, index) => formatBeneficiary(beneficiary, enrolmentMap.get(beneficiary.id), index)),
    source: "supabase" as const,
  };
}

function formatBeneficiary(
  beneficiary: BeneficiaryRecord,
  enrolment: EnrolmentRecord | undefined,
  index: number,
): BeneficiaryRow {
  const programme = Array.isArray(enrolment?.programmes) ? enrolment?.programmes[0] : enrolment?.programmes;
  const stage = Array.isArray(enrolment?.programme_stages)
    ? enrolment?.programme_stages[0]
    : enrolment?.programme_stages;
  const scoreRel = Array.isArray(enrolment?.enrolment_scorecards)
    ? enrolment?.enrolment_scorecards[0]
    : enrolment?.enrolment_scorecards;
  const scorecardEnabled = usesEducationScorecard(programme?.pipeline_template_key);

  return {
    id: beneficiary.id,
    enrolment_id: enrolment?.id ?? null,
    beneficiary_code: beneficiary.beneficiary_code ?? "BEN-UNSET",
    full_name: beneficiary.full_name ?? "Unnamed beneficiary",
    programme_id: programme?.id ?? null,
    programme_name: programme?.name ?? "Not linked yet",
    programme_code: programme?.programme_code,
    programme_pipeline_template_key: programme?.pipeline_template_key ?? null,
    programme_modules: programme?.enabled_modules ?? [],
    community: beneficiary.community ?? "Unknown community",
    state: beneficiary.state ?? "Unknown state",
    guardian_name: beneficiary.guardian_name ?? "Guardian not captured",
    guardian_phone: beneficiary.guardian_phone ?? "No phone on file",
    consent_status: beneficiary.consent_status ?? "pending",
    safeguarding_flag: beneficiary.safeguarding_flag ?? "none",
    current_status: enrolment?.status ?? "pending",
    last_activity: relativeActivityDate(index),
    risk_flag: (beneficiary.safeguarding_flag ?? "none") === "none" ? "clear" : "review",
    highlights: (programme?.enabled_modules ?? []).slice(0, 3).map((module) => module.replace(/_/g, " ")),
    stage_id: enrolment?.stage_id ?? null,
    stage_label: stage?.label ?? null,
    decision: enrolment?.decision ?? null,
    decision_reason: enrolment?.decision_reason ?? null,
    scorecard: scorecardEnabled && scoreRel ? { ...scoreRel } : null,
    consent_received: beneficiary.consent_received ?? false,
    consent_evidence_drive_file_id: beneficiary.consent_evidence_drive_file_id ?? null,
    consent_recorded_at: beneficiary.consent_recorded_at ?? null,
    profile_image_drive_file_id: beneficiary.profile_image_drive_file_id ?? null,
    profile_image_folder_id: beneficiary.profile_image_folder_id ?? null,
    profile_image_mime_type: beneficiary.profile_image_mime_type ?? null,
    profile_image_size_bytes: beneficiary.profile_image_size_bytes ?? null,
    profile_image_uploaded_at: beneficiary.profile_image_uploaded_at ?? null,
  };
}

function buildMockBeneficiaries(programmes: ProgrammeRow[]): BeneficiaryRow[] {
  const references = programmes.length ? programmes : [];

  const base = (): Pick<
    BeneficiaryRow,
    | "id"
    | "enrolment_id"
    | "programme_id"
    | "stage_id"
    | "stage_label"
    | "decision"
    | "decision_reason"
    | "scorecard"
    | "consent_received"
    | "consent_evidence_drive_file_id"
    | "consent_recorded_at"
    | "profile_image_drive_file_id"
    | "profile_image_folder_id"
    | "profile_image_mime_type"
    | "profile_image_size_bytes"
    | "profile_image_uploaded_at"
  > => ({
    id: null,
    enrolment_id: null,
    programme_id: null,
    stage_id: null,
    stage_label: null,
    decision: null,
    decision_reason: null,
    scorecard: null,
    consent_received: false,
    consent_evidence_drive_file_id: null,
    consent_recorded_at: null,
    profile_image_drive_file_id: null,
    profile_image_folder_id: null,
    profile_image_mime_type: null,
    profile_image_size_bytes: null,
    profile_image_uploaded_at: null,
  });

  return [
    {
      ...base(),
      beneficiary_code: "BEN-2026-000512",
      full_name: "Chinedu I. Okafor",
      programme_name: references[0]?.name ?? "Girls' Education & Dignity Initiative",
      programme_code: references[0]?.programme_code ?? "PRG-2026-0001",
      programme_pipeline_template_key: references[0]?.pipeline_template_key ?? null,
      programme_modules: references[0]?.enabled_modules ?? ["beneficiaries", "activities", "evidence"],
      community: "Karu",
      state: "Abuja, FCT",
      guardian_name: "Ifeoma Okafor",
      guardian_phone: "0803 123 4567",
      consent_status: "consent_captured",
      safeguarding_flag: "reviewed",
      current_status: "active",
      last_activity: relativeActivityDate(1),
      risk_flag: "review",
      highlights: ["consent captured", "safeguarding reviewed", "active in programme"],
    },
    {
      ...base(),
      beneficiary_code: "BEN-2026-000511",
      full_name: "Amina S. Ibrahim",
      programme_name: references[1]?.name ?? "Back to School",
      programme_code: references[1]?.programme_code ?? "PRG-2026-0002",
      programme_pipeline_template_key: references[1]?.pipeline_template_key ?? null,
      programme_modules: references[1]?.enabled_modules ?? ["beneficiaries", "evidence"],
      community: "Kubwa",
      state: "Abuja, FCT",
      guardian_name: "Sani Ibrahim",
      guardian_phone: "0807 987 6543",
      consent_status: "consent_captured",
      safeguarding_flag: "none",
      current_status: "active",
      last_activity: relativeActivityDate(2),
      risk_flag: "clear",
      highlights: ["support active", "evidence enabled"],
    },
    {
      ...base(),
      beneficiary_code: "BEN-2026-000510",
      full_name: "Maryam B. Aliyu",
      programme_name: references[2]?.name ?? "Pad-Up Campaign",
      programme_code: references[2]?.programme_code ?? "PRG-2026-0003",
      programme_pipeline_template_key: references[2]?.pipeline_template_key ?? null,
      programme_modules: references[2]?.enabled_modules ?? ["beneficiaries", "activities", "evidence"],
      community: "Gwagwalada",
      state: "Abuja, FCT",
      guardian_name: "Bello Aliyu",
      guardian_phone: "0805 000 1111",
      consent_status: "photo_consent_pending",
      safeguarding_flag: "follow_up_needed",
      current_status: "follow_up",
      last_activity: relativeActivityDate(3),
      risk_flag: "review",
      highlights: ["follow-up needed", "photo consent pending"],
    },
  ];
}

function relativeActivityDate(index: number) {
  const date = new Date();
  date.setDate(date.getDate() - index);
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
