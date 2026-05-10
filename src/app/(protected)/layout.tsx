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
        <Link className="brand-mark" href="/dashboard" prefetch={false}>
          <div className="brand-mark__icon">❤</div>
          <div className="brand-mark__text">
            <strong>ADLAI</strong>
            <span>Heroes Foundation</span>
          </div>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false}>
              <span className="nav-list__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="sidebar-note__mark">ImpactOps</div>
          <p>Record programmes, people, and proof without losing operational clarity.</p>
          <Link href="/auth/sign-out" prefetch={false}>
            Sign out
          </Link>
        </div>
      </aside>
      <section className="workspace-shell">
        <header className="workspace-topbar">
          <div className="workspace-topbar__spacer" />
          <div className="workspace-topbar__actions">
            <button className="topbar-icon" type="button" aria-label="Search">
              ⌕
            </button>
            <div className="topbar-profile">
              <div className="topbar-profile__avatar">{(user.email?.[0] ?? "A").toUpperCase()}</div>
              <div>
                <strong>{user.email?.split("@")[0] ?? "Adlai User"}</strong>
                <span>Programme Officer</span>
              </div>
            </div>
          </div>
        </header>
        <section className="workspace">{children}</section>
      </section>
    </main>
  );
}
