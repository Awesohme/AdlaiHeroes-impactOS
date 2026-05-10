import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/env";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
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

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    const headerStore = await headers();
    const next = sanitizeNextPath(headerStore.get("x-auth-path"));
    redirect(`/auth/login?next=${encodeURIComponent(next)}&error=session`);
  }

  return user;
}
