"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type AppRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserActionResult = { ok: true } | { ok: false; error: string };

const VALID_ROLES: AppRole[] = [
  "admin",
  "programme_officer",
  "me_lead",
  "volunteer_coordinator",
  "volunteer",
  "viewer",
];

const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (lower.includes("duplicate key") || lower.includes("already exists") || lower.includes("already been registered")) {
    if (lower.includes("username")) return "That username is already taken.";
    if (lower.includes("email") || lower.includes("users_email")) return "That email already has an account.";
    return "A user with that username or email already exists.";
  }
  if (lower.includes("password should be at least")) return "Password must be at least 8 characters.";
  return message;
}

async function activeAdminCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);
  return count ?? 0;
}

export async function inviteUserAction(formData: FormData): Promise<UserActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "viewer") as AppRole;

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "Username must be 3–32 chars, lowercase letters, digits, dot/underscore/hyphen." };
  }
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!VALID_ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const admin = createAdminClient();

  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) return { ok: false, error: "That username is already taken." };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    return { ok: false, error: mapError(createError?.message, "Could not create user.") };
  }

  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      full_name: fullName,
      email,
      username,
      role,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: mapError(upsertError.message, "Could not save profile.") };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateUserRoleAction(
  userId: string,
  role: AppRole,
): Promise<UserActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised." };
  }
  if (!VALID_ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const admin = createAdminClient();

  if (role !== "admin") {
    const { data: target } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (target?.role === "admin" && target.is_active) {
      const adminsLeft = await activeAdminCount();
      if (adminsLeft <= 1) {
        return { ok: false, error: "Can't demote the last active admin." };
      }
    }
  }

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: mapError(error.message, "Could not update role.") };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<UserActionResult> {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised." };
  }

  if (!active && userId === me.id) {
    return { ok: false, error: "You can't deactivate yourself." };
  }

  const admin = createAdminClient();
  if (!active) {
    const { data: target } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (target?.role === "admin" && target.is_active) {
      const adminsLeft = await activeAdminCount();
      if (adminsLeft <= 1) {
        return { ok: false, error: "Can't deactivate the last active admin." };
      }
    }
  }

  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: mapError(error.message, "Could not update user.") };
  revalidatePath("/settings");
  return { ok: true };
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
): Promise<UserActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised." };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { ok: false, error: mapError(error.message, "Could not reset password.") };
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised." };
  }

  if (userId === me.id) return { ok: false, error: "You can't delete yourself." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (target?.role === "admin" && target.is_active) {
    const adminsLeft = await activeAdminCount();
    if (adminsLeft <= 1) {
      return { ok: false, error: "Can't delete the last active admin." };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: mapError(error.message, "Could not delete user.") };
  revalidatePath("/settings");
  return { ok: true };
}
