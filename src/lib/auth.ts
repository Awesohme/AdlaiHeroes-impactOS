import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/env";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
};

export type AppRole =
  | "admin"
  | "programme_officer"
  | "me_lead"
  | "volunteer_coordinator"
  | "volunteer"
  | "viewer";

export type CurrentProfile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string;
  role: AppRole;
  is_active: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? user.email ?? null,
    username: data.username ?? null,
    full_name: data.full_name ?? "",
    role: data.role as AppRole,
    is_active: data.is_active ?? false,
  };
}

export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active || profile.role !== "admin") {
    throw new Error("Not authorised.");
  }
  return profile;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    const headerStore = await headers();
    const next = sanitizeNextPath(headerStore.get("x-auth-path"));
    redirect(`/auth/login?next=${encodeURIComponent(next)}&error=session`);
  }

  return user;
}
