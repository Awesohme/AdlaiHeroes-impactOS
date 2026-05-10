"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateBeneficiaryResult =
  | { ok: true; beneficiaryId: string; beneficiaryCode: string }
  | { ok: false; error: string };

const validConsent = new Set(["not_recorded", "consent_captured", "photo_consent_pending", "declined"]);
const validSafeguarding = new Set(["none", "reviewed", "follow_up_needed"]);
const validGender = new Set(["", "female", "male", "non_binary", "prefer_not_to_say"]);

function mapDbError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled. Run the latest SQL block, then try again.";
  }
  if (message.includes("duplicate key") || message.includes("beneficiary_code")) {
    return "A beneficiary with that code already exists. Choose a different code.";
  }
  return message;
}

export async function createBeneficiaryAction(
  formData: FormData,
): Promise<CreateBeneficiaryResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Full name is required." };

  const codeOverride = String(formData.get("beneficiary_code") ?? "").trim().toUpperCase();
  const gender = String(formData.get("gender") ?? "").trim();
  if (!validGender.has(gender)) return { ok: false, error: "Invalid gender." };

  const consent = String(formData.get("consent_status") ?? "not_recorded").trim();
  if (!validConsent.has(consent)) return { ok: false, error: "Invalid consent status." };

  const photoVideoConsent = String(
    formData.get("photo_video_consent") ?? "not_recorded",
  ).trim();
  if (!validConsent.has(photoVideoConsent))
    return { ok: false, error: "Invalid photo/video consent value." };

  const safeguarding = String(formData.get("safeguarding_flag") ?? "none").trim();
  if (!validSafeguarding.has(safeguarding))
    return { ok: false, error: "Invalid safeguarding flag." };

  const supabase = await createClient();
  const userSuppliedCode = Boolean(codeOverride);
  let beneficiaryCode = codeOverride || (await generateBeneficiaryCode(supabase));

  const buildPayload = (code: string) => ({
    beneficiary_code: code,
    full_name: fullName,
    gender: gender || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || null,
    guardian_name: String(formData.get("guardian_name") ?? "").trim() || null,
    guardian_phone: String(formData.get("guardian_phone") ?? "").trim() || null,
    community: String(formData.get("community") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    school_name: String(formData.get("school_name") ?? "").trim() || null,
    consent_status: consent,
    photo_video_consent: photoVideoConsent,
    safeguarding_flag: safeguarding,
  });

  const maxAttempts = userSuppliedCode ? 1 : 5;
  let lastError: { message?: string; code?: string } | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await supabase
      .from("beneficiaries")
      .insert(buildPayload(beneficiaryCode))
      .select("id, beneficiary_code")
      .single();
    if (data) {
      revalidatePath("/beneficiaries");
      return { ok: true, beneficiaryId: data.id, beneficiaryCode: data.beneficiary_code };
    }
    lastError = error ?? null;
    const isUniqueViolation =
      error?.code === "23505" || (error?.message ?? "").includes("beneficiary_code");
    if (!isUniqueViolation || userSuppliedCode) break;
    beneficiaryCode = await generateBeneficiaryCode(supabase, attempt + 1);
  }
  return {
    ok: false,
    error: mapDbError(lastError?.message, "Could not create beneficiary."),
  };
}

async function generateBeneficiaryCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  retryOffset = 0,
) {
  const year = new Date().getFullYear();
  const prefix = `BEN-${year}-`;
  const { data } = await supabase
    .from("beneficiaries")
    .select("beneficiary_code")
    .ilike("beneficiary_code", `${prefix}%`)
    .order("beneficiary_code", { ascending: false })
    .limit(50);
  const highest = (data ?? []).reduce((max, row) => {
    const match = row.beneficiary_code.match(/(\d{6})$/) ?? row.beneficiary_code.match(/(\d{4,})$/);
    const current = match ? Number(match[1]) : 0;
    return current > max ? current : max;
  }, 0);
  return `${prefix}${String(highest + 1 + retryOffset).padStart(6, "0")}`;
}
