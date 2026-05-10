"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";

export function MobileNav({
  email,
  username,
  initial,
}: {
  email: string | null;
  username: string;
  initial: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5"
          >
            <Image
              src="/adlai-logo.jpg"
              alt="Adlai Heroes Foundation"
              width={36}
              height={36}
              className="h-9 w-9 rounded-md object-contain"
              priority
            />
            <div className="flex flex-col leading-tight">
              <SheetTitle className="text-sm font-semibold tracking-tight">
                Adlai Heroes
              </SheetTitle>
              <span className="text-xs text-muted-foreground">ImpactOps</span>
            </div>
          </Link>
        </SheetHeader>
        <div className="py-4" onClick={() => setOpen(false)}>
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initial}
            </div>
            <div className="flex flex-1 flex-col leading-tight overflow-hidden">
              <span className="text-sm font-medium truncate">{username}</span>
              <span className="text-xs text-muted-foreground truncate">{email}</span>
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
      </SheetContent>
    </Sheet>
  );
}
