import Link from "next/link";

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
  const error = params?.error ? authErrors[params.error] ?? `Auth error: ${params.error}` : null;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Secure access</p>
        <h1>Sign in to Adlai ImpactOps</h1>
        <p>
          Use an approved Google account. Real beneficiary data stays blocked until role-aware RLS and profiles are verified.
        </p>
        {error ? (
          <div className="data-banner">
            <strong>Auth check failed.</strong>
            <span>{error}</span>
          </div>
        ) : null}
        <Link className="button button--primary" href={`/auth/sign-in${next}`}>
          Continue with Google
        </Link>
        <Link className="auth-card__back" href="/auth/debug">
          Open auth debug
        </Link>
        <Link className="auth-card__back" href="/">
          Back to overview
        </Link>
      </section>
    </main>
  );
}
