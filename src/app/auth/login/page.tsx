import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginSubmitButton } from "@/components/auth/login-submit-button";

const authErrors: Record<string, string> = {
  callback: "We could not finish Google sign-in in this browser window. Try again or use username/password instead.",
  env: "Supabase environment variables are missing on the server.",
  missing_code: "Google sign-in returned without an authorization code.",
  oauth: "Google sign-in could not be started from the server route.",
  not_invited: "This account is not invited. Ask an admin to add you first.",
  invalid_credentials: "Username or password is incorrect.",
  role_pending:
    "Your account can sign in, but edit access is not active yet. Ask an admin to finish your role setup.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ? `?next=${encodeURIComponent(params.next)}` : "";
  const isRecoverableGoogleIssue = params?.error === "session";
  const error =
    params?.error && !isRecoverableGoogleIssue
      ? authErrors[params.error] ?? "We could not complete sign-in. Try again."
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
            Use an approved Google account or the username/password your admin created for you.
            Access opens only after your role is active.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}
          <GoogleSignInButton href={`/auth/sign-in${next}`} />
          <p className="text-center text-xs text-muted-foreground">
            If Google does not open correctly here, open this page in Chrome or Safari and try again.
          </p>

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
              <Label htmlFor="identifier" className="text-xs">Username or email</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                placeholder="your.handle or you@example.com"
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
            <LoginSubmitButton />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
