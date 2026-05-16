import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ProductTour, ProductTourButton } from "@/components/product-tour";
import { LogOut, Search } from "lucide-react";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const initial = (user.email?.[0] ?? "A").toUpperCase();
  const username = user.email?.split("@")[0] ?? "Adlai user";

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background md:flex">
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex items-center gap-2.5 px-5 py-4 border-b"
        >
          <Image
            src="/adlai-logo.jpg"
            alt="Adlai Heroes Foundation"
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-contain"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Adlai Heroes</span>
            <span className="text-xs text-muted-foreground">ImpactOps</span>
          </div>
        </Link>
        <div className="py-4 flex-1">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initial}
            </div>
            <div className="flex flex-1 flex-col leading-tight overflow-hidden">
              <span className="text-sm font-medium truncate">{username}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
            <Link
              href="/auth/sign-out"
              prefetch={false}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 sm:px-6 backdrop-blur">
          <MobileNav email={user.email ?? null} username={username} initial={initial} />
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ProductTourButton />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">{children}</main>
      </div>
      <ProductTour userKey={user.id} />
    </div>
  );
}
