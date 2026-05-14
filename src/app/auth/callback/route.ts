import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/env";
import { createRouteClient } from "@/lib/supabase/route";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
  }

  try {
    const { supabase, applyCookies } = createRouteClient(request);
    const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !exchange?.user) {
      return NextResponse.redirect(new URL("/auth/login?error=callback", request.url));
    }

    const email = exchange.user.email?.toLowerCase() ?? null;
    if (!email) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login?error=not_invited", request.url));
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login?error=not_invited", request.url));
    }

    return applyCookies(
      NextResponse.redirect(new URL(`/auth/post-login?next=${encodeURIComponent(next)}`, request.url)),
    );
  } catch {
    return NextResponse.redirect(new URL("/auth/login?error=env", request.url));
  }
}
