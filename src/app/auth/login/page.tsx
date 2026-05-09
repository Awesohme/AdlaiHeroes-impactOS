import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ? `?next=${encodeURIComponent(params.next)}` : "";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Secure access</p>
        <h1>Sign in to Adlai ImpactOps</h1>
        <p>
          Use an approved Google account. Real beneficiary data stays blocked until role-aware RLS and profiles are verified.
        </p>
        <Link className="button button--primary" href={`/auth/sign-in${next}`}>
          Continue with Google
        </Link>
        <Link className="auth-card__back" href="/">
          Back to overview
        </Link>
      </section>
    </main>
  );
}
