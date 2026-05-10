import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertCircle } from "lucide-react";

const authErrors: Record<string, string> = {
  callback: "Google sign-in returned, but the session exchange failed.",
  env: "Supabase environment variables are missing on the server.",
  missing_code: "Google sign-in returned without an authorization code.",
  oauth: "Google sign-in could not be started from the server route.",
  session: "Sign-in completed, but no durable session was found on the next request.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ? `?next=${encodeURIComponent(params.next)}` : "";
  const error = params?.error
    ? authErrors[params.error] ?? `Auth error: ${params.error}`
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" fill="currentColor" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Adlai ImpactOps
          </p>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use an approved Google account. Real beneficiary data stays blocked until role-aware
            access is verified.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <Button asChild className="w-full">
            <Link href={`/auth/sign-in${next}`}>Continue with Google</Link>
          </Button>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/auth/debug" className="hover:underline">
              Auth debug
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
