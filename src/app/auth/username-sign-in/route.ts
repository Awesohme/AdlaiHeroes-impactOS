import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/env";
import { createRouteClient } from "@/lib/supabase/route";
import { createAdminClient } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  // Accept either "username" or "identifier" — the form may post either name.
  const rawIdentifier = String(
    form.get("identifier") ?? form.get("username") ?? "",
  )
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = sanitizeNextPath(String(form.get("next") ?? ""));

  function fail(code: string) {
    const url = new URL(`/auth/login?error=${code}`, request.url);
    if (next && next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!rawIdentifier || !password) return fail("invalid_credentials");

  const looksLikeEmail = EMAIL_PATTERN.test(rawIdentifier);
  if (!looksLikeEmail && !USERNAME_PATTERN.test(rawIdentifier)) {
    return fail("invalid_credentials");
  }

  let email: string;
  try {
    const admin = createAdminClient();
    const query = admin
      .from("profiles")
      .select("email, is_active")
      .eq("is_active", true);
    const { data } = await (looksLikeEmail
      ? query.ilike("email", rawIdentifier)
      : query.eq("username", rawIdentifier)
    ).maybeSingle();
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
