import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=callback", request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
