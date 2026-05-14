import { programmeRows } from "@/lib/sample-records";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  defaultProgrammeFieldKeys,
  getFieldDefinition,
  type ProgrammeFieldType,
  type ProgrammeModuleKey,
  type ProgrammeStatus,
} from "@/lib/programme-config";

export type ProgrammeDataFieldRow = {
  field_key: string;
  label: string;
  field_type: ProgrammeFieldType;
  required: boolean;
  required_from_stage_key?: string | null;
  position: number;
  enabled: boolean;
};

export type ProgrammeRow = {
  id?: string;
  programme_code: string;
  name: string;
  programme_type: string;
  status: string;
  donor_funder: string;
  location_areas: string[];
  expected_beneficiaries: number | null;
  budget_ngn: number | null;
  objectives: string;
  programme_description: string;
  target_group: string;
  start_date: string | null;
  end_date: string | null;
  enabled_modules: ProgrammeModuleKey[];
  data_fields: ProgrammeDataFieldRow[];
  progress: number;
  timeline_label: string;
  reach: string;
  flyer_drive_file_id: string | null;
  funds_raised: number;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

type ProgrammeRecord = {
  id: string;
  programme_code: string;
  name: string;
  programme_type: string;
  donor: string | null;
  donor_funder: string | null;
  location: string | null;
  location_areas: string[] | null;
  target_group: string | null;
  expected_beneficiaries: number | null;
  budget_ngn: number | string | null;
  objectives: string | null;
  programme_description: string | null;
  starts_on: string | null;
  start_date: string | null;
  ends_on: string | null;
  end_date: string | null;
  status: ProgrammeStatus | string;
  enabled_modules: ProgrammeModuleKey[] | null;
  flyer_drive_file_id?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  archive_reason?: string | null;
  programme_data_fields?: ProgrammeDataFieldRow[] | null;
};

export type ProgrammeArchiveScope = "active" | "archived" | "all";

const programmeSelect = `
  id,
  programme_code,
  name,
  programme_type,
  donor,
  donor_funder,
  location,
  location_areas,
  target_group,
  expected_beneficiaries,
  budget_ngn,
  objectives,
  programme_description,
  starts_on,
  start_date,
  ends_on,
  end_date,
  status,
  enabled_modules,
  flyer_drive_file_id,
  archived_at,
  archived_by,
  archive_reason,
  programme_data_fields (
    field_key,
    label,
    field_type,
    required,
    required_from_stage_key,
    position,
    enabled
  )
`;

const legacyProgrammeSelect = `
  id,
  programme_code,
  name,
  programme_type,
  donor,
  donor_funder,
  location,
  location_areas,
  target_group,
  expected_beneficiaries,
  budget_ngn,
  objectives,
  programme_description,
  starts_on,
  start_date,
  ends_on,
  end_date,
  status,
  enabled_modules,
  flyer_drive_file_id,
  programme_data_fields (
    field_key,
    label,
    field_type,
    required,
    required_from_stage_key,
    position,
    enabled
  )
`;

export async function getProgrammes(options?: { archiveScope?: ProgrammeArchiveScope }): Promise<{
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}> {
  if (!hasSupabaseBrowserEnv()) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: "Supabase env vars are not configured.",
    };
  }

  const supabase = await createClient();
  const archiveScope = options?.archiveScope ?? "active";

  let query = supabase.from("programmes").select(programmeSelect);
  if (archiveScope === "active") query = query.is("archived_at", null);
  if (archiveScope === "archived") query = query.not("archived_at", "is", null);

  const initial = await query.order("created_at", { ascending: false }).limit(80);
  let data = initial.data as ProgrammeRecord[] | null;
  let error = initial.error;

  if (error?.message.includes("archived_at")) {
    const fallback = await supabase
      .from("programmes")
      .select(legacyProgrammeSelect)
      .order("created_at", { ascending: false })
      .limit(80);
    data = fallback.data as ProgrammeRecord[] | null;
    error = fallback.error;
  }

  if (error) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: error.message,
    };
  }

  if (!data?.length && archiveScope !== "active") {
    return {
      rows: [],
      source: "supabase",
    };
  }

  if (!data?.length) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: "Supabase returned no programmes yet.",
    };
  }

  return {
    rows: data.map(formatProgramme),
    source: "supabase",
  };
}

export async function getProgrammeByCode(programmeCode: string) {
  if (!hasSupabaseBrowserEnv()) {
    const fallback = mockProgrammes().find((row) => row.programme_code === programmeCode);
    return {
      programme: fallback ?? null,
      source: "mock" as const,
      error: fallback ? undefined : "Programme not found in fallback data.",
    };
  }

  const supabase = await createClient();
  const initial = await supabase
    .from("programmes")
    .select(programmeSelect)
    .eq("programme_code", programmeCode)
    .maybeSingle();
  let data = initial.data as ProgrammeRecord | null;
  let error = initial.error;

  if (error?.message.includes("archived_at")) {
    const fallback = await supabase
      .from("programmes")
      .select(legacyProgrammeSelect)
      .eq("programme_code", programmeCode)
      .maybeSingle();
    data = fallback.data as ProgrammeRecord | null;
    error = fallback.error;
  }

  if (error) {
    return { programme: null, source: "supabase" as const, error: error.message };
  }

  if (!data) {
    return { programme: null, source: "supabase" as const, error: "Programme not found." };
  }

  return {
    programme: formatProgramme(data),
    source: "supabase" as const,
  };
}

export function buildProgrammeSelectOptions(rows: ProgrammeRow[]) {
  return rows.map((row) => ({
    value: row.programme_code,
    label: row.name,
  }));
}

function formatProgramme(programme: ProgrammeRecord): ProgrammeRow {
  const locationAreas = normaliseLocations(programme.location_areas, programme.location);
  const dataFields = normaliseDataFields(programme.programme_data_fields);
  const startDate = programme.start_date ?? programme.starts_on;
  const endDate = programme.end_date ?? programme.ends_on;
  const donorFunder = programme.donor_funder ?? programme.donor ?? "Adlai Heroes Foundation";
  const expectedBeneficiaries = programme.expected_beneficiaries ?? null;
  const budget = programme.budget_ngn === null ? null : Number(programme.budget_ngn);
  const status = programme.status ?? "draft";

  return {
    id: programme.id,
    programme_code: programme.programme_code,
    name: programme.name,
    programme_type: programme.programme_type,
    status,
    donor_funder: donorFunder,
    location_areas: locationAreas,
    expected_beneficiaries: expectedBeneficiaries,
    budget_ngn: budget,
    objectives: programme.objectives ?? "",
    programme_description: programme.programme_description ?? "",
    target_group: programme.target_group ?? "",
    start_date: startDate,
    end_date: endDate,
    enabled_modules: (programme.enabled_modules ?? []) as ProgrammeModuleKey[],
    data_fields: dataFields,
    progress: deriveProgress(status, startDate, endDate),
    timeline_label: formatTimeline(startDate, endDate),
    reach: expectedBeneficiaries ? `${expectedBeneficiaries.toLocaleString()} beneficiaries` : "Not set",
    flyer_drive_file_id: programme.flyer_drive_file_id ?? null,
    funds_raised: 0,
    archived_at: programme.archived_at ?? null,
    archived_by: programme.archived_by ?? null,
    archive_reason: programme.archive_reason ?? null,
  };
}

export async function getProgrammesWithFunding(options?: { archiveScope?: ProgrammeArchiveScope }): Promise<{
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}> {
  const result = await getProgrammes(options);
  if (result.source !== "supabase" || result.rows.length === 0) return result;
  try {
    const supabase = await createClient();
    const ids = result.rows.map((row) => row.id).filter((id): id is string => !!id);
    if (ids.length === 0) return result;
    const { data, error } = await supabase
      .from("programme_funds")
      .select("programme_id,amount_ngn")
      .in("programme_id", ids);
    if (error || !data) return result;
    const totals = new Map<string, number>();
    for (const row of data) {
      if (!row.programme_id) continue;
      totals.set(row.programme_id, (totals.get(row.programme_id) ?? 0) + Number(row.amount_ngn));
    }
    return {
      ...result,
      rows: result.rows.map((row) =>
        row.id ? { ...row, funds_raised: totals.get(row.id) ?? 0 } : row,
      ),
    };
  } catch {
    return result;
  }
}

function normaliseLocations(locationAreas: string[] | null, location: string | null) {
  if (locationAreas?.length) {
    return locationAreas;
  }

  return location ? location.split(",").map((value) => value.trim()).filter(Boolean) : [];
}

function normaliseDataFields(dataFields: ProgrammeDataFieldRow[] | null | undefined) {
  if (dataFields?.length) {
    return [...dataFields].sort((left, right) => left.position - right.position);
  }

  return defaultProgrammeFieldKeys.map((fieldKey, index) => {
    const definition = getFieldDefinition(fieldKey);

    return {
      field_key: fieldKey,
      label: definition?.label ?? fieldKey,
      field_type: definition?.field_type ?? "text",
      required: index < 4,
      position: index,
      enabled: true,
    };
  });
}

function deriveProgress(status: string, startDate: string | null, endDate: string | null) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return 100;
  }

  if (normalized === "active") {
    return 68;
  }

  if (normalized === "monitoring") {
    return 84;
  }

  if (normalized === "at_risk") {
    return 32;
  }

  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const ratio = Math.min(Math.max((now - start) / (end - start), 0), 1);
      return Math.round(ratio * 100);
    }
  }

  return 18;
}

function formatTimeline(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "Dates pending";
  }

  if (startDate && !endDate) {
    return `Starts ${formatDateLabel(startDate)}`;
  }

  if (!startDate && endDate) {
    return `Ends ${formatDateLabel(endDate)}`;
  }

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function mockProgrammes(): ProgrammeRow[] {
  return programmeRows.map(([programme_code, name, programme_type, status, reach], index) => ({
    programme_code: String(programme_code),
    name: String(name),
    programme_type: String(programme_type),
    status: String(status).toLowerCase().replace(/\s+/g, "_"),
    donor_funder: "Adlai Heroes Foundation",
    location_areas: index % 2 === 0 ? ["Abuja, FCT", "Kano"] : ["Lagos", "Ogun"],
    expected_beneficiaries: parseInt(String(reach).replace(/[^\d]/g, ""), 10) || null,
    budget_ngn: [25000000, 18750000, 9500000][index % 3] ?? 0,
    objectives: "Improve programme reach, evidence quality, and beneficiary follow-through through a stronger operational record.",
    programme_description: "Reference-mode fallback record while the live programme table is still empty or unavailable.",
    target_group: index % 2 === 0 ? "Adolescent Girls (10-19 years)" : "Community Households",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    enabled_modules: ["beneficiaries", "activities", "evidence", "reporting", "education_support"],
    data_fields: normaliseDataFields(null),
    progress: [74, 52, 28][index % 3] ?? 0,
    timeline_label: "Jan 1, 2026 - Dec 31, 2026",
    reach: String(reach),
    flyer_drive_file_id: null,
    funds_raised: 0,
    archived_at: null,
    archived_by: null,
    archive_reason: null,
  }));
}
