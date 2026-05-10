import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { requireUser } from "@/lib/auth";
import { programmeRows } from "@/lib/sample-records";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const user = await requireUser();

  return (
    <AppFrame
      eyebrow="Programme management"
      title="Programmes"
      description="Create, configure, publish, and monitor every Adlai programme from one structured place."
      user={user}
      action={<button className="button button--primary">New programme</button>}
    >
      <div className="data-banner">
        <strong>Programmes UI is live.</strong>
        <span>Live Supabase reads are temporarily paused while we finish the role-aware access handoff.</span>
      </div>
      <section className="workspace-card">
        <DataTable
          columns={["Code", "Programme", "Type", "Status", "Reach"]}
          rows={programmeRows}
        />
      </section>
    </AppFrame>
  );
}
