import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { requireUser } from "@/lib/auth";
import { getProgrammes } from "@/lib/programmes";

export default async function ProgrammesPage() {
  const user = await requireUser();
  const programmes = await getProgrammes();

  return (
    <AppFrame
      eyebrow="Programme management"
      title="Programmes"
      description="Create, configure, publish, and monitor every Adlai programme from one structured place."
      user={user}
      action={<button className="button button--primary">New programme</button>}
    >
      {programmes.source === "mock" ? (
        <div className="data-banner">
          <strong>Mock data active.</strong>
          <span>{programmes.error ?? "Connect Supabase and add records to switch this table live."}</span>
        </div>
      ) : (
        <div className="data-banner data-banner--live">
          <strong>Live Supabase data.</strong>
          <span>This table is reading from the `programmes` table.</span>
        </div>
      )}
      <section className="workspace-card">
        <DataTable
          columns={["Code", "Programme", "Type", "Status", "Reach"]}
          rows={programmes.rows.map((row) => [
            row.programme_code,
            row.name,
            row.programme_type,
            row.status,
            row.reach,
          ])}
        />
      </section>
    </AppFrame>
  );
}
