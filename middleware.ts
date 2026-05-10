import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = ["/", "/auth/login", "/auth/callback", "/auth/sign-in", "/auth/post-login", "/auth/debug"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = publicRoutes.includes(pathname);
  const session = await updateSession(request);

  if (!session) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("error", "env");
      return NextResponse.redirect(url);
    }

    return NextResponse.next({
      request,
    });
  }

  const { response, user } = session;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/auth/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
