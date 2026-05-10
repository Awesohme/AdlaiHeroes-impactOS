"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateProgrammeState = {
  error?: string;
  success?: string;
  fields?: {
    name?: string;
    programme_code?: string;
    programme_type?: string;
    donor?: string;
    location?: string;
    starts_on?: string;
    ends_on?: string;
    status?: string;
  };
};

const validStatuses = new Set(["draft", "planned", "active", "monitoring"]);

export async function createProgrammeAction(
  _previousState: CreateProgrammeState,
  formData: FormData,
): Promise<CreateProgrammeState> {
  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    programme_code: String(formData.get("programme_code") ?? "").trim().toUpperCase(),
    programme_type: String(formData.get("programme_type") ?? "").trim(),
    donor: String(formData.get("donor") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    starts_on: String(formData.get("starts_on") ?? "").trim(),
    ends_on: String(formData.get("ends_on") ?? "").trim(),
    status: String(formData.get("status") ?? "draft").trim().toLowerCase(),
  };

  if (!fields.name || !fields.programme_code || !fields.programme_type) {
    return {
      error: "Programme name, code, and type are required.",
      fields,
    };
  }

  if (!validStatuses.has(fields.status)) {
    return {
      error: "Choose a valid programme status.",
      fields,
    };
  }

  if (fields.starts_on && fields.ends_on && fields.starts_on > fields.ends_on) {
    return {
      error: "End date cannot be earlier than start date.",
      fields,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your session expired. Sign in again before creating a programme.",
      fields,
    };
  }

  const { error } = await supabase.from("programmes").insert({
    programme_code: fields.programme_code,
    name: fields.name,
    programme_type: fields.programme_type,
    donor: fields.donor || null,
    location: fields.location || null,
    starts_on: fields.starts_on || null,
    ends_on: fields.ends_on || null,
    status: fields.status,
    owner_id: user.id,
  });

  if (error) {
    return {
      error:
        error.message.includes("row-level security") || error.message.includes("permission denied")
          ? "Database write access is not enabled yet for your role. Run the programme write policy SQL, then try again."
          : error.message,
      fields,
    };
  }

  redirect("/programmes?created=1");
}
