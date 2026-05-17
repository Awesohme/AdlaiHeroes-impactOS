"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import {
  getDriveDebugSnapshot,
  testGoogleDocsSetup,
  testGoogleDriveSetup,
} from "@/lib/google-drive/server";
import {
  hasReportAiEncryptionKey,
  resolveReportAiConfig,
  saveStoredReportAiSettings,
} from "@/lib/report-ai-settings";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ProgrammeFieldType } from "@/lib/programme-config";

const validFieldTypes = new Set<ProgrammeFieldType>([
  "text",
  "number",
  "select",
  "multi_select",
  "yes_no",
  "location",
  "image",
  "signature",
]);

export type FieldTemplateActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ProgrammeTypeActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ReportAiSettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type IntegrationTestActionResult =
  | {
      ok: true;
      message: string;
      diagnostics: {
        mode: string;
        tokenEmail: string;
        driveUserEmail: string;
        driveScope: string;
        rootLookupStatus: string;
      };
    }
  | {
      ok: false;
      error: string;
      diagnostics?: {
        mode: string;
        tokenEmail: string;
        driveUserEmail: string;
        driveScope: string;
        rootLookupStatus: string;
      };
    };

function mapDbError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Database write access is not enabled. Run the latest SQL block in Supabase.";
  }
  if (message.includes("does not exist") || message.includes("relation \"public.")) {
    return "Required settings table is not live yet. Run the latest SQL block in Supabase, then retry.";
  }
  if (message.includes("duplicate key")) {
    return "A field with that key already exists.";
  }
  return message;
}

export async function createProgrammeTypeAction(formData: FormData): Promise<ProgrammeTypeActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { ok: false, error: "Programme type name is required." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("programme_types")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("programme_types").insert({
    name,
    description: description || null,
    position,
    is_active: true,
  });
  if (error) return { ok: false, error: mapDbError(error.message, "Could not create programme type.") };
  revalidatePath("/settings");
  revalidatePath("/programmes");
  revalidatePath("/programmes/new");
  return { ok: true };
}

export async function updateProgrammeTypeAction(
  id: string,
  payload: { name: string; description: string; is_active: boolean },
): Promise<ProgrammeTypeActionResult> {
  if (!payload.name.trim()) return { ok: false, error: "Programme type name is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("programme_types")
    .update({
      name: payload.name.trim(),
      description: payload.description.trim() || null,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not update programme type.") };
  revalidatePath("/settings");
  revalidatePath("/programmes");
  revalidatePath("/programmes/new");
  return { ok: true };
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

  const options = parseOptions(String(formData.get("options") ?? ""));

  const { error } = await supabase.from("field_templates").insert({
    field_key: fieldKey,
    label,
    field_type: fieldType,
    description: description || null,
    default_required: defaultRequired,
    position,
    options,
  });
  if (error) return { ok: false, error: mapDbError(error.message, "Could not create field.") };
  revalidatePath("/settings");
  revalidatePath("/programmes/new");
  return { ok: true };
}

export async function updateFieldTemplateAction(
  id: string,
  payload: {
    label: string;
    field_type: ProgrammeFieldType;
    description: string;
    default_required: boolean;
    options: string[];
  },
): Promise<FieldTemplateActionResult> {
  if (!payload.label.trim()) return { ok: false, error: "Label is required." };
  if (!validFieldTypes.has(payload.field_type)) return { ok: false, error: "Invalid field type." };
  const supabase = await createClient();
  const cleanedOptions = (payload.options ?? [])
    .map((o) => String(o).trim())
    .filter(Boolean);
  const { error } = await supabase
    .from("field_templates")
    .update({
      label: payload.label.trim(),
      field_type: payload.field_type,
      description: payload.description.trim() || null,
      default_required: payload.default_required,
      options: cleanedOptions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: mapDbError(error.message, "Could not update field.") };
  revalidatePath("/settings");
  revalidatePath("/programmes/new");
  return { ok: true };
}

function parseOptions(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

export async function testGoogleDocsConnectionAction() {
  try {
    await testGoogleDocsSetup();
    const snapshot = await getDriveDebugSnapshot();
    redirect(
      `/settings?doc_test=ok&drive_mode=${encodeURIComponent(snapshot.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot.tokenEmail)}&drive_user_email=${encodeURIComponent(snapshot.driveUserEmail)}&drive_scope=${encodeURIComponent(snapshot.scopes.join(", "))}&drive_root_status=${encodeURIComponent(snapshot.rootLookupMessage)}`,
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("Google Docs readiness test failed", error);
    const snapshot = await getDriveDebugSnapshot().catch(() => null);
    const message =
      error instanceof Error ? error.message.slice(0, 220) : "Unknown Google Docs setup error.";
    redirect(
      `/settings?doc_test=error&doc_error=${encodeURIComponent(message)}&drive_mode=${encodeURIComponent(snapshot?.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot?.tokenEmail ?? "")}&drive_user_email=${encodeURIComponent(snapshot?.driveUserEmail ?? "")}&drive_scope=${encodeURIComponent(snapshot?.scopes.join(", ") ?? "")}&drive_root_status=${encodeURIComponent(snapshot?.rootLookupMessage ?? "")}`,
    );
  }
}

export async function testGoogleDriveConnectionResultAction(): Promise<IntegrationTestActionResult> {
  try {
    await testGoogleDriveSetup();
    const snapshot = await getDriveDebugSnapshot();
    return {
      ok: true,
      message: "Drive root verified successfully.",
      diagnostics: {
        mode: snapshot.mode ?? "—",
        tokenEmail: snapshot.tokenEmail,
        driveUserEmail: snapshot.driveUserEmail,
        driveScope: snapshot.scopes.join(", "),
        rootLookupStatus: snapshot.rootLookupMessage,
      },
    };
  } catch (error) {
    console.error("Google Drive readiness test failed", error);
    const snapshot = await getDriveDebugSnapshot().catch(() => null);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message.slice(0, 220) : "Unknown Google Drive setup error.",
      diagnostics: snapshot
        ? {
            mode: snapshot.mode ?? "—",
            tokenEmail: snapshot.tokenEmail,
            driveUserEmail: snapshot.driveUserEmail,
            driveScope: snapshot.scopes.join(", "),
            rootLookupStatus: snapshot.rootLookupMessage,
          }
        : undefined,
    };
  }
}

export async function testGoogleDocsConnectionResultAction(): Promise<IntegrationTestActionResult> {
  try {
    await testGoogleDocsSetup();
    const snapshot = await getDriveDebugSnapshot();
    return {
      ok: true,
      message: "Google Docs create/write verified successfully.",
      diagnostics: {
        mode: snapshot.mode ?? "—",
        tokenEmail: snapshot.tokenEmail,
        driveUserEmail: snapshot.driveUserEmail,
        driveScope: snapshot.scopes.join(", "),
        rootLookupStatus: snapshot.rootLookupMessage,
      },
    };
  } catch (error) {
    console.error("Google Docs readiness test failed", error);
    const snapshot = await getDriveDebugSnapshot().catch(() => null);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message.slice(0, 220) : "Unknown Google Docs setup error.",
      diagnostics: snapshot
        ? {
            mode: snapshot.mode ?? "—",
            tokenEmail: snapshot.tokenEmail,
            driveUserEmail: snapshot.driveUserEmail,
            driveScope: snapshot.scopes.join(", "),
            rootLookupStatus: snapshot.rootLookupMessage,
          }
        : undefined,
    };
  }
}

export async function saveReportAiSettingsAction(
  payload: {
    enabled: boolean;
    endpoint: string;
    model: string;
    apiKey?: string;
  },
): Promise<ReportAiSettingsActionResult> {
  const profile = await requireAdmin().catch(() => null);
  if (!profile) {
    return { ok: false, error: "Only admins can update AI settings." };
  }

  if (payload.apiKey?.trim() && !hasReportAiEncryptionKey()) {
    return {
      ok: false,
      error: "APP_CONFIG_ENCRYPTION_KEY is missing on the server, so the API key cannot be stored safely yet.",
    };
  }

  const { error } = await saveStoredReportAiSettings({
    enabled: payload.enabled,
    endpoint: payload.endpoint,
    model: payload.model,
    apiKey: payload.apiKey,
    updatedBy: profile.id,
  });

  if (error) {
    return {
      ok: false,
      error: mapDbError(error.message, "Could not save AI settings."),
    };
  }

  revalidatePath("/settings");
  return {
    ok: true,
    message: "AI settings saved.",
  };
}

export async function testReportAiConnectionAction(): Promise<ReportAiSettingsActionResult> {
  const profile = await requireAdmin().catch(() => null);
  if (!profile) {
    return { ok: false, error: "Only admins can test AI settings." };
  }

  const config = await resolveReportAiConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: "AI is not enabled yet. Save an in-app config or enable the fallback env settings first.",
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Reply with the single word OK.",
          },
          {
            role: "user",
            content: "Health check",
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: "The AI endpoint rejected the key. Check the configured API key and endpoint pairing." };
      }
      return { ok: false, error: `The AI endpoint responded with status ${response.status}.` };
    }

    return {
      ok: true,
      message: `AI connection verified using ${config.source === "db" ? "in-app settings" : "server env fallback"}.`,
    };
  } catch {
    return {
      ok: false,
      error: "ImpactOps could not reach the AI endpoint. Check the endpoint URL, server network access, and API key.",
    };
  }
}
