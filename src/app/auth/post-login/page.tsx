import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params?.next);
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(next)}&error=session`);
  }

  redirect(next);
}
