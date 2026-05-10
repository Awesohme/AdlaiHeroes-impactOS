import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { navigation } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <main className="product-shell">
      <aside className="sidebar">
        <Link className="brand-mark" href="/" prefetch={false}>
          <span>AI</span>
          <strong>Adlai ImpactOps</strong>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>Phase 1</span>
          <p>Supabase records. Google Drive files. Sheets exports. Vercel frontend.</p>
          {user.email ? <small>{user.email}</small> : null}
          <Link href="/auth/sign-out" prefetch={false}>
            Sign out
          </Link>
        </div>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
