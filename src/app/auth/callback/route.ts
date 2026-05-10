import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/env";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
  }

  try {
    const { supabase, applyCookies } = createRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=callback", request.url));
    }

    return applyCookies(
      NextResponse.redirect(new URL(`/auth/post-login?next=${encodeURIComponent(next)}`, request.url)),
    );
  } catch {
    return NextResponse.redirect(new URL("/auth/login?error=env", request.url));
  }
}
