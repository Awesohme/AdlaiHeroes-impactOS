"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { getDriveDebugSnapshot, testGoogleDriveSetup } from "@/lib/google-drive/server";
import { createClient } from "@/lib/supabase/server";
import type { ProgrammeFieldType } from "@/lib/programme-config";

const validFieldTypes = new Set<ProgrammeFieldType>([
  "text",
  "number",
  "select",
  "yes_no",
  "location",
]);

export type FieldTemplateActionResult =
  | { ok: true }
  | { ok: false; error: string };

function mapDbError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled. Run the latest SQL block in Supabase.";
  }
  if (message.includes("does not exist") || message.includes("relation \"public.")) {
    return "field_templates table is not live yet. Run the latest SQL block, then retry.";
  }
  if (message.includes("duplicate key")) {
    return "A field with that key already exists.";
  }
  return message;
}

export async function createFieldTemplateAction(formData: FormData): Promise<FieldTemplateActionResult> {
  const fieldKeyRaw = String(formData.get("field_key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const fieldType = String(formData.get("field_type") ?? "text").trim() as ProgrammeFieldType;
  const description = String(formData.get("description") ?? "").trim();
  const defaultRequired = formData.get("default_required") === "on";

  if (!label) return { ok: false, error: "Label is required." };
  if (!validFieldTypes.has(fieldType)) return { ok: false, error: "Invalid field type." };

  const fieldKey =
    fieldKeyRaw ||
    label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!fieldKey) return { ok: false, error: "Use letters or numbers in label or key." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("field_templates")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("field_templates").insert({
    field_key: fieldKey,
    label,
    field_type: fieldType,
    description: description || null,
    default_required: defaultRequired,
    position,
  });
  if (error) return { ok: false, error: mapDbError(error.message, "Could not create field.") };
  revalidatePath("/settings");
  revalidatePath("/programmes/new");
  return { ok: true };
}

export async function updateFieldTemplateAction(
  id: string,
  payload: { label: string; field_type: ProgrammeFieldType; description: string; default_required: boolean },
): Promise<FieldTemplateActionResult> {
  if (!payload.label.trim()) return { ok: false, error: "Label is required." };
  if (!validFieldTypes.has(payload.field_type)) return { ok: false, error: "Invalid field type." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("field_templates")
    .update({
      label: payload.label.trim(),
      field_type: payload.field_type,
      description: payload.description.trim() || null,
      default_required: payload.default_required,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not update field.") };
  revalidatePath("/settings");
  revalidatePath("/programmes/new");
  return { ok: true };
}

export async function deleteFieldTemplateAction(id: string): Promise<FieldTemplateActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("field_templates").delete().eq("id", id);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not delete field.") };
  revalidatePath("/settings");
  revalidatePath("/programmes/new");
  return { ok: true };
}

export async function testGoogleDriveConnectionAction() {
  try {
    await testGoogleDriveSetup();
    const snapshot = await getDriveDebugSnapshot();
    redirect(
      `/settings?drive_test=ok&drive_mode=${encodeURIComponent(snapshot.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot.tokenEmail)}&drive_user_email=${encodeURIComponent(snapshot.driveUserEmail)}&drive_scope=${encodeURIComponent(snapshot.scopes.join(", "))}&drive_root_status=${encodeURIComponent(snapshot.rootLookupMessage)}`,
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("Google Drive readiness test failed", error);
    const snapshot = await getDriveDebugSnapshot().catch(() => null);
    const message =
      error instanceof Error
        ? error.message.slice(0, 220)
        : "Unknown Google Drive setup error.";
    redirect(
      `/settings?drive_test=error&drive_error=${encodeURIComponent(message)}&drive_mode=${encodeURIComponent(snapshot?.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot?.tokenEmail ?? "")}&drive_user_email=${encodeURIComponent(snapshot?.driveUserEmail ?? "")}&drive_scope=${encodeURIComponent(snapshot?.scopes.join(", ") ?? "")}&drive_root_status=${encodeURIComponent(snapshot?.rootLookupMessage ?? "")}`,
    );
  }
}
