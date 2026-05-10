"use server";

import { redirect } from "next/navigation";
import type { ProgrammeFieldType, ProgrammeModuleKey, ProgrammeStatus } from "@/lib/programme-config";
import { createClient } from "@/lib/supabase/server";

export type ProgrammeFieldPayload = {
  field_key: string;
  label: string;
  field_type: ProgrammeFieldType;
  required: boolean;
  position: number;
  enabled: boolean;
};

export type SaveProgrammeState = {
  error?: string;
  fields?: {
    programme_id?: string;
    name?: string;
    programme_code?: string;
    programme_type?: string;
    donor_funder?: string;
    target_group?: string;
    expected_beneficiaries?: string;
    budget_ngn?: string;
    objectives?: string;
    programme_description?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    location_areas_json?: string;
    enabled_modules_json?: string;
    data_fields_json?: string;
  };
};

const validStatuses = new Set<ProgrammeStatus>(["draft", "planned", "active", "monitoring", "completed", "at_risk"]);
const validFieldTypes = new Set<ProgrammeFieldType>(["text", "number", "select", "yes_no", "location"]);

export async function saveProgrammeAction(
  _previousState: SaveProgrammeState,
  formData: FormData,
): Promise<SaveProgrammeState> {
  const intent = String(formData.get("intent") ?? "draft").trim().toLowerCase();
  const existingProgrammeId = String(formData.get("programme_id") ?? "").trim();
  const submittedStatus =
    !existingProgrammeId && intent === "publish"
      ? "planned"
      : String(formData.get("status") ?? "draft").trim().toLowerCase();

  const fields = {
    programme_id: existingProgrammeId,
    name: String(formData.get("name") ?? "").trim(),
    programme_code: String(formData.get("programme_code") ?? "").trim().toUpperCase(),
    programme_type: String(formData.get("programme_type") ?? "").trim(),
    donor_funder: String(formData.get("donor_funder") ?? "").trim(),
    target_group: String(formData.get("target_group") ?? "").trim(),
    expected_beneficiaries: String(formData.get("expected_beneficiaries") ?? "").trim(),
    budget_ngn: String(formData.get("budget_ngn") ?? "").trim(),
    objectives: String(formData.get("objectives") ?? "").trim(),
    programme_description: String(formData.get("programme_description") ?? "").trim(),
    start_date: String(formData.get("start_date") ?? "").trim(),
    end_date: String(formData.get("end_date") ?? "").trim(),
    status: submittedStatus,
    location_areas_json: String(formData.get("location_areas_json") ?? "[]"),
    enabled_modules_json: String(formData.get("enabled_modules_json") ?? "[]"),
    data_fields_json: String(formData.get("data_fields_json") ?? "[]"),
  };

  const locationAreas = parseStringArray(fields.location_areas_json);
  const enabledModules = parseStringArray(fields.enabled_modules_json) as ProgrammeModuleKey[];
  const dataFields = parseProgrammeFields(fields.data_fields_json);
  const expectedBeneficiaries = fields.expected_beneficiaries ? Number(fields.expected_beneficiaries.replace(/[^\d]/g, "")) : null;
  const budgetNgn = fields.budget_ngn ? Number(fields.budget_ngn.replace(/,/g, "")) : null;

  if (!fields.name || !fields.programme_type || !fields.target_group || !locationAreas.length) {
    return {
      error: "Programme name, type, target group, and at least one operating location are required.",
      fields,
    };
  }

  if (!validStatuses.has(fields.status as ProgrammeStatus)) {
    return {
      error: "Choose a valid programme status.",
      fields,
    };
  }

  if (fields.start_date && fields.end_date && fields.start_date > fields.end_date) {
    return {
      error: "End date cannot be earlier than start date.",
      fields,
    };
  }

  if (expectedBeneficiaries !== null && (!Number.isFinite(expectedBeneficiaries) || expectedBeneficiaries < 0)) {
    return {
      error: "Expected beneficiaries must be a valid non-negative number.",
      fields,
    };
  }

  if (budgetNgn !== null && (!Number.isFinite(budgetNgn) || budgetNgn < 0)) {
    return {
      error: "Budget must be a valid non-negative amount.",
      fields,
    };
  }

  if (!dataFields.length) {
    return {
      error: "Pick at least one data field for the programme configuration.",
      fields,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your session expired. Sign in again before saving a programme.",
      fields,
    };
  }

  if (!fields.programme_code) {
    fields.programme_code = await generateProgrammeCode(supabase);
  }

  const programmePayload = {
    programme_code: fields.programme_code,
    name: fields.name,
    programme_type: fields.programme_type,
    donor: fields.donor_funder || null,
    donor_funder: fields.donor_funder || null,
    location: locationAreas.join(", ") || null,
    location_areas: locationAreas,
    target_group: fields.target_group || null,
    expected_beneficiaries: expectedBeneficiaries,
    budget_ngn: budgetNgn,
    objectives: fields.objectives || null,
    programme_description: fields.programme_description || null,
    starts_on: fields.start_date || null,
    start_date: fields.start_date || null,
    ends_on: fields.end_date || null,
    end_date: fields.end_date || null,
    status: fields.status,
    enabled_modules: enabledModules,
    owner_id: user.id,
  };

  const isEdit = Boolean(fields.programme_id);
  const mutation = isEdit
    ? supabase.from("programmes").update(programmePayload).eq("id", fields.programme_id).select("id, programme_code").single()
    : supabase.from("programmes").insert(programmePayload).select("id, programme_code").single();

  const { data: savedProgramme, error } = await mutation;

  if (error || !savedProgramme) {
    return {
      error: mapSaveError(error?.message),
      fields,
    };
  }

  const programmeId = savedProgramme.id;

  const { error: deleteError } = await supabase.from("programme_data_fields").delete().eq("programme_id", programmeId);

  if (deleteError && !deleteError.message.includes("does not exist")) {
    return {
      error: mapSaveError(deleteError.message),
      fields,
    };
  }

  const fieldRows = dataFields.map((field, index) => ({
    programme_id: programmeId,
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    required: field.required,
    position: index,
    enabled: field.enabled,
  }));

  const { error: fieldError } = await supabase.from("programme_data_fields").insert(fieldRows);

  if (fieldError) {
    return {
      error: mapSaveError(fieldError.message),
      fields,
    };
  }

  redirect(`/programmes?${isEdit ? "updated=1" : "created=1"}&code=${encodeURIComponent(savedProgramme.programme_code)}`);
}

function parseStringArray(raw: string) {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseProgrammeFields(raw: string): ProgrammeFieldPayload[] {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => ({
        field_key: String(item.field_key ?? "").trim(),
        label: String(item.label ?? "").trim(),
        field_type: String(item.field_type ?? "").trim() as ProgrammeFieldType,
        required: Boolean(item.required),
        position: Number(item.position ?? index),
        enabled: item.enabled !== false,
      }))
      .filter((item) => item.field_key && item.label && validFieldTypes.has(item.field_type));
  } catch {
    return [];
  }
}

function mapSaveError(message?: string) {
  if (!message) {
    return "Something went wrong while saving this programme.";
  }

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled yet for your role. Run the updated programme write policy SQL, then try again.";
  }

  if (message.includes("programme_data_fields")) {
    return "The richer programme schema is not live yet. Run supabase/programme-model-upgrade.sql and the updated write-policy SQL, then try again.";
  }

  return message;
}

async function generateProgrammeCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  const year = new Date().getFullYear();
  const prefix = `PRG-${year}-`;

  const { data } = await supabase
    .from("programmes")
    .select("programme_code")
    .ilike("programme_code", `${prefix}%`)
    .order("programme_code", { ascending: false })
    .limit(50);

  const highest = (data ?? []).reduce((max, row) => {
    const match = row.programme_code.match(/(\d{4})$/);
    const current = match ? Number(match[1]) : 0;
    return current > max ? current : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}
