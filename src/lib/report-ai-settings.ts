import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

export type StoredReportAiSettings = {
  enabled: boolean;
  endpoint: string;
  model: string;
  keyConfigured: boolean;
  updatedAt: string | null;
};

export type ResolvedReportAiConfig = {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
  source: "db" | "env" | "none";
};

const REPORT_AI_SETTING_KEY = "reports_ai";
const DEFAULT_REPORT_AI_MODEL = "gpt-4.1-mini";

export async function getStoredReportAiSettings(): Promise<StoredReportAiSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("enabled,endpoint,model,api_key_ciphertext,updated_at")
    .eq("setting_key", REPORT_AI_SETTING_KEY)
    .maybeSingle();

  if (!data) return null;

  return {
    enabled: Boolean(data.enabled),
    endpoint: String(data.endpoint ?? "").trim(),
    model: String(data.model ?? "").trim() || DEFAULT_REPORT_AI_MODEL,
    keyConfigured: Boolean(data.api_key_ciphertext),
    updatedAt: data.updated_at ?? null,
  };
}

export async function resolveReportAiConfig(): Promise<ResolvedReportAiConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("enabled,endpoint,model,api_key_ciphertext")
    .eq("setting_key", REPORT_AI_SETTING_KEY)
    .maybeSingle();

  if (data?.enabled) {
    const endpoint = String(data.endpoint ?? "").trim();
    const model = String(data.model ?? "").trim() || DEFAULT_REPORT_AI_MODEL;
    const apiKey = decryptSecret(String(data.api_key_ciphertext ?? "").trim());
    if (endpoint && apiKey) {
      return {
        enabled: true,
        endpoint,
        apiKey,
        model,
        source: "db",
      };
    }
  }

  const envEnabled = String(process.env.REPORT_AI_ENABLED ?? "").trim().toLowerCase() === "true";
  const envEndpoint = String(process.env.REPORT_AI_ENDPOINT ?? "").trim();
  const envApiKey = String(process.env.REPORT_AI_API_KEY ?? "").trim();
  const envModel = String(process.env.REPORT_AI_MODEL ?? "").trim() || DEFAULT_REPORT_AI_MODEL;

  if (envEnabled && envEndpoint && envApiKey) {
    return {
      enabled: true,
      endpoint: envEndpoint,
      apiKey: envApiKey,
      model: envModel,
      source: "env",
    };
  }

  return {
    enabled: false,
    endpoint: "",
    apiKey: "",
    model: envModel,
    source: "none",
  };
}

export async function saveStoredReportAiSettings(input: {
  enabled: boolean;
  endpoint: string;
  model: string;
  apiKey?: string;
  updatedBy: string;
}) {
  const supabase = await createClient();
  const payload: {
    setting_key: string;
    enabled: boolean;
    endpoint: string | null;
    model: string | null;
    updated_by: string;
    api_key_ciphertext?: string;
    updated_at: string;
  } = {
    setting_key: REPORT_AI_SETTING_KEY,
    enabled: input.enabled,
    endpoint: input.endpoint.trim() || null,
    model: input.model.trim() || DEFAULT_REPORT_AI_MODEL,
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  };

  if (typeof input.apiKey === "string" && input.apiKey.trim()) {
    payload.api_key_ciphertext = encryptSecret(input.apiKey.trim());
  }

  return supabase.from("ai_settings").upsert(payload, { onConflict: "setting_key" });
}

export function hasReportAiEncryptionKey() {
  return Boolean(String(process.env.APP_CONFIG_ENCRYPTION_KEY ?? "").trim());
}

function encryptSecret(value: string) {
  const key = deriveEncryptionKey();
  if (!key) {
    throw new Error("APP_CONFIG_ENCRYPTION_KEY is missing.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function decryptSecret(value: string) {
  const key = deriveEncryptionKey();
  if (!key || !value) {
    return "";
  }
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = value.split(":");
  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    return "";
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivEncoded, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTagEncoded, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return "";
  }
}

function deriveEncryptionKey() {
  const raw = String(process.env.APP_CONFIG_ENCRYPTION_KEY ?? "").trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}
