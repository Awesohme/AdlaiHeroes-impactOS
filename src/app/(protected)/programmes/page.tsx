import { AppFrame } from "@/components/app-frame";
import { ProgrammesOverview } from "@/components/programmes/programmes-overview";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const programmes = await getProgrammes();

  return (
    <AppFrame
      eyebrow="Programme management"
      title="Programmes"
      description="Create, configure, publish, and monitor every Adlai programme from one structured place."
      action={<a className="button button--primary" href="/programmes/new">New programme</a>}
    >
      <ProgrammesOverview error={programmes.error} rows={programmes.rows} source={programmes.source} />
    </AppFrame>
  );
}
