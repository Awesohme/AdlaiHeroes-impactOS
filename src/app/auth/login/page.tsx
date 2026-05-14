import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const authErrors: Record<string, string> = {
  callback: "Google sign-in returned, but the session exchange failed.",
  env: "Supabase environment variables are missing on the server.",
  missing_code: "Google sign-in returned without an authorization code.",
  oauth: "Google sign-in could not be started from the server route.",
  session: "Sign-in completed, but no durable session was found on the next request.",
  not_invited: "This account is not invited. Ask an admin to add you first.",
  invalid_credentials: "Username or password is incorrect.",
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
          <Image
            src="/adlai-logo.jpg"
            alt="Adlai Heroes Foundation"
            width={72}
            height={72}
            className="mx-auto h-18 w-18 rounded-md object-contain"
            priority
          />
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
            <Link href={`/auth/sign-in${next}`}>Continue with Adlai Google</Link>
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form method="post" action="/auth/username-sign-in" className="space-y-3">
            {params?.next ? <input type="hidden" name="next" value={params.next} /> : null}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="your.handle"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Sign in with username
            </Button>
          </form>

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
