import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/env";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteClient(request);
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL(`/auth/login?error=oauth`, request.url));
  }

  return applyCookies(NextResponse.redirect(data.url));
}
