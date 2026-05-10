import { hasSupabaseBrowserEnv } from "@/lib/env";
import type { ProgrammeModuleKey } from "@/lib/programme-config";
import type { ProgrammeRow } from "@/lib/programmes";
import { createClient } from "@/lib/supabase/server";

export type BeneficiaryRow = {
  beneficiary_code: string;
  full_name: string;
  programme_name: string;
  programme_code?: string;
  programme_modules: ProgrammeModuleKey[];
  community: string;
  state: string;
  school_name: string;
  guardian_name: string;
  guardian_phone: string;
  consent_status: string;
  safeguarding_flag: string;
  current_status: string;
  last_activity: string;
  risk_flag: string;
  highlights: string[];
};

type BeneficiaryRecord = {
  id: string;
  beneficiary_code: string;
  full_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  community: string | null;
  state: string | null;
  school_name: string | null;
  consent_status: string;
  safeguarding_flag: string;
};

type EnrolmentRecord = {
  beneficiary_id: string;
  status: string;
  programmes:
    | {
        name: string;
        programme_code: string;
        enabled_modules: ProgrammeModuleKey[] | null;
      }
    | {
        name: string;
        programme_code: string;
        enabled_modules: ProgrammeModuleKey[] | null;
      }[]
    | null;
};

export async function getBeneficiaries(programmes: ProgrammeRow[]) {
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
        .select("id,beneficiary_code,full_name,guardian_name,guardian_phone,community,state,school_name,consent_status,safeguarding_flag")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("enrolments")
        .select("beneficiary_id,status,programmes(name,programme_code,enabled_modules)")
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

  return {
    beneficiary_code: beneficiary.beneficiary_code,
    full_name: beneficiary.full_name,
    programme_name: programme?.name ?? "Not linked yet",
    programme_code: programme?.programme_code,
    programme_modules: programme?.enabled_modules ?? [],
    community: beneficiary.community ?? "Unknown community",
    state: beneficiary.state ?? "Unknown state",
    school_name: beneficiary.school_name ?? "School not captured",
    guardian_name: beneficiary.guardian_name ?? "Guardian not captured",
    guardian_phone: beneficiary.guardian_phone ?? "No phone on file",
    consent_status: beneficiary.consent_status,
    safeguarding_flag: beneficiary.safeguarding_flag,
    current_status: enrolment?.status ?? "pending",
    last_activity: relativeActivityDate(index),
    risk_flag: beneficiary.safeguarding_flag === "none" ? "clear" : "review",
    highlights: (programme?.enabled_modules ?? []).slice(0, 3).map((module) => module.replace(/_/g, " ")),
  };
}

function buildMockBeneficiaries(programmes: ProgrammeRow[]): BeneficiaryRow[] {
  const references = programmes.length ? programmes : [];

  return [
    {
      beneficiary_code: "BEN-2026-000512",
      full_name: "Chinedu I. Okafor",
      programme_name: references[0]?.name ?? "Girls' Education & Dignity Initiative",
      programme_code: references[0]?.programme_code ?? "PRG-2026-0001",
      programme_modules: references[0]?.enabled_modules ?? ["beneficiaries", "activities", "evidence"],
      community: "Karu",
      state: "Abuja, FCT",
      school_name: "Government Secondary School, Karu",
      guardian_name: "Ifeoma Okafor",
      guardian_phone: "0803 123 4567",
      consent_status: "consent_captured",
      safeguarding_flag: "reviewed",
      current_status: "active",
      last_activity: "May 29, 2026",
      risk_flag: "review",
      highlights: ["consent captured", "safeguarding reviewed", "active in programme"],
    },
    {
      beneficiary_code: "BEN-2026-000511",
      full_name: "Amina S. Ibrahim",
      programme_name: references[1]?.name ?? "Back to School",
      programme_code: references[1]?.programme_code ?? "PRG-2026-0002",
      programme_modules: references[1]?.enabled_modules ?? ["beneficiaries", "evidence"],
      community: "Kubwa",
      state: "Abuja, FCT",
      school_name: "LEA Primary School, Kubwa",
      guardian_name: "Sani Ibrahim",
      guardian_phone: "0807 987 6543",
      consent_status: "consent_captured",
      safeguarding_flag: "none",
      current_status: "active",
      last_activity: "May 28, 2026",
      risk_flag: "clear",
      highlights: ["school support", "evidence enabled"],
    },
    {
      beneficiary_code: "BEN-2026-000510",
      full_name: "Maryam B. Aliyu",
      programme_name: references[2]?.name ?? "Pad-Up Campaign",
      programme_code: references[2]?.programme_code ?? "PRG-2026-0003",
      programme_modules: references[2]?.enabled_modules ?? ["beneficiaries", "activities", "evidence"],
      community: "Gwagwalada",
      state: "Abuja, FCT",
      school_name: "Gwagwalada Secondary School",
      guardian_name: "Bello Aliyu",
      guardian_phone: "0805 000 1111",
      consent_status: "photo_consent_pending",
      safeguarding_flag: "follow_up_needed",
      current_status: "follow_up",
      last_activity: "May 26, 2026",
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
