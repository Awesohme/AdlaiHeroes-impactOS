import Link from "next/link";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { navigation } from "@/lib/navigation";

export async function AppFrame({
  title,
  eyebrow,
  description,
  action,
  user: initialUser,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  action?: React.ReactNode;
  user?: CurrentUser;
  children: React.ReactNode;
}) {
  const user = initialUser ?? (await requireUser());

  return (
    <main className="product-shell">
      <aside className="sidebar">
        <Link className="brand-mark" href="/">
          <span>AI</span>
          <strong>Adlai ImpactOps</strong>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>Phase 1</span>
          <p>Supabase records. Google Drive files. Sheets exports. Vercel frontend.</p>
          {user.email ? <small>{user.email}</small> : null}
          <Link href="/auth/sign-out">Sign out</Link>
        </div>
      </aside>
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {action}
        </header>
        {children}
      </section>
    </main>
  );
}
