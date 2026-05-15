"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadBeneficiaryPhotoToDrive } from "@/lib/google-drive/server";

export type CreateBeneficiaryResult =
  | { ok: true; beneficiaryId: string; beneficiaryCode: string; warning?: string }
  | { ok: false; error: string };

const validConsent = new Set(["not_recorded", "consent_captured", "photo_consent_pending", "declined"]);
const validSafeguarding = new Set(["none", "reviewed", "follow_up_needed"]);
const validGender = new Set(["", "female", "male", "non_binary", "prefer_not_to_say"]);
const validImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProfileImageBytes = 8 * 1024 * 1024;

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
  const profileImage = formData.get("profile_image");
  const profileImageFile = profileImage instanceof File && profileImage.size > 0 ? profileImage : null;
  if (profileImageFile) {
    if (!validImageTypes.has(profileImageFile.type)) {
      return { ok: false, error: "Profile image must be JPG, PNG, or WebP." };
    }
    if (profileImageFile.size > maxProfileImageBytes) {
      return { ok: false, error: "Profile image must be 8MB or smaller." };
    }
  }

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
    consent_status: consent,
    photo_video_consent: photoVideoConsent,
    safeguarding_flag: safeguarding,
    consent_received: false,
    consent_recorded_at: null,
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
      let warning: string | undefined;
      if (profileImageFile) {
        try {
          const uploaded = await uploadBeneficiaryPhotoToDrive({
            file: profileImageFile,
            beneficiaryCode: data.beneficiary_code,
            beneficiaryName: fullName,
          });
          const { error: photoError } = await supabase
            .from("beneficiaries")
            .update({
              profile_image_drive_file_id: uploaded.fileId,
              profile_image_folder_id: uploaded.driveFolderId,
              profile_image_mime_type: uploaded.mimeType,
              profile_image_size_bytes: uploaded.fileSizeBytes,
              profile_image_uploaded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.id);
          if (photoError) {
            warning = "Beneficiary created, but the profile image metadata could not be saved.";
          }
        } catch (error) {
          warning =
            error instanceof Error
              ? `Beneficiary created, but profile image upload failed: ${error.message}`
              : "Beneficiary created, but profile image upload failed.";
        }
      }
      revalidatePath("/beneficiaries");
      return { ok: true, beneficiaryId: data.id, beneficiaryCode: data.beneficiary_code, warning };
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
