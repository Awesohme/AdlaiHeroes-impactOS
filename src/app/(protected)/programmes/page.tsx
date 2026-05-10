import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { ProgrammesOverview } from "@/components/programmes/programmes-overview";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const programmes = await getProgrammes();
  const created = params.created === "1";
  const updated = params.updated === "1";

  return (
    <AppFrame
      eyebrow="Programme portfolio"
      title="Programmes"
      description="Manage programme setup, budgets, timelines, data fields, and delivery status from one cleaner operational workspace."
      action={
        <div className="page-actions">
          <button className="button button--ghost" type="button">
            Import Programme Plan
          </button>
          <Link className="button button--primary" href="/programmes/new" prefetch={false}>
            Create Programme
          </Link>
        </div>
      }
    >
      <ProgrammesOverview
        error={programmes.error}
        notice={
          created ? "Programme created successfully." : updated ? "Programme updated successfully." : undefined
        }
        rows={programmes.rows}
        source={programmes.source}
      />
    </AppFrame>
  );
}
