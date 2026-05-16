import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { ProgrammesOverview } from "@/components/programmes/programmes-overview";
import { getProgrammesWithFunding, type ProgrammeArchiveScope } from "@/lib/programmes";
import { getCurrentProfile } from "@/lib/auth";
import { Plus } from "lucide-react";

export const revalidate = 30;

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = parseArchiveScope(params.view);
  const [programmes, currentProfile] = await Promise.all([
    getProgrammesWithFunding({ archiveScope: view }),
    getCurrentProfile(),
  ]);
  const created = params.created === "1";
  const updated = params.updated === "1";
  const canManageOps =
    currentProfile?.is_active &&
    (currentProfile.role === "admin" ||
      currentProfile.role === "programme_officer" ||
      currentProfile.role === "me_lead");

  return (
    <AppFrame
      eyebrow="Portfolio"
      title="Programmes"
      description="Setup, budgets, timelines, fields, and delivery status across the portfolio."
      action={
        <Button size="sm" asChild>
          <Link href="/programmes/new" prefetch={false}>
            <Plus className="h-4 w-4" /> New programme
          </Link>
        </Button>
      }
    >
      <ProgrammesOverview
        error={programmes.error}
        notice={
          created
            ? "Programme created successfully."
            : updated
              ? "Programme updated successfully."
              : undefined
        }
        rows={programmes.rows}
        canManageOps={Boolean(canManageOps)}
        archiveScope={view}
        source={programmes.source}
      />
    </AppFrame>
  );
}

function parseArchiveScope(value: string | string[] | undefined): ProgrammeArchiveScope {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}
