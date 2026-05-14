import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/env";
import { createRouteClient } from "@/lib/supabase/route";
import { createAdminClient } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const rawUsername = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = sanitizeNextPath(String(form.get("next") ?? ""));

  function fail(code: string) {
    const url = new URL(`/auth/login?error=${code}`, request.url);
    if (next && next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!rawUsername || !password) return fail("invalid_credentials");
  if (!USERNAME_PATTERN.test(rawUsername)) return fail("invalid_credentials");

  let email: string;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("email, is_active")
      .eq("username", rawUsername)
      .maybeSingle();
    if (!data || !data.is_active || !data.email) return fail("invalid_credentials");
    email = data.email;
  } catch {
    return fail("env");
  }

  try {
    const { supabase, applyCookies } = createRouteClient(request);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail("invalid_credentials");
    return applyCookies(
      NextResponse.redirect(
        new URL(`/auth/post-login?next=${encodeURIComponent(next)}`, request.url),
        { status: 303 },
      ),
    );
  } catch {
    return fail("env");
  }
}
