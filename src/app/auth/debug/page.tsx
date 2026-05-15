import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthDebugPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active || profile.role !== "admin") {
    redirect("/auth/login");
  }

  const headerStore = await headers();
  const cookieStore = await cookies();
  const cookieNames = cookieStore
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("sb-") || name.includes("supabase") || name.includes("auth-token"));

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Auth debug</p>
        <h1>Session diagnostics</h1>
        <p>Use this temporary page to compare middleware state, cookies, and server user reads on one request.</p>
        <div className="workspace-card settings-list">
          <article>
            <div>
              <h2>Current path</h2>
              <p>{headerStore.get("x-auth-path") ?? "/auth/debug"}</p>
            </div>
            <span>{headerStore.get("x-authenticated") === "true" ? "Middleware sees auth" : "Middleware sees guest"}</span>
          </article>
          <article>
            <div>
              <h2>Server user</h2>
              <p>{`${profile.email ?? "No email"} (${profile.id})`}</p>
            </div>
            <span>Admin user found</span>
          </article>
          <article>
            <div>
              <h2>Auth cookie names</h2>
              <p>{cookieNames.length ? cookieNames.join(", ") : "No auth cookies detected"}</p>
            </div>
            <span>{cookieNames.length ? `${cookieNames.length} cookies` : "None"}</span>
          </article>
          <article>
            <div>
              <h2>Latest error</h2>
              <p>{params?.error ?? "No error query param"}</p>
            </div>
            <span>Temporary route</span>
          </article>
        </div>
      </section>
    </main>
  );
}
