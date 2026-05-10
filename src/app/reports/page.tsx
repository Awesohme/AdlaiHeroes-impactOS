import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { reportRows } from "@/lib/sample-records";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <AppFrame
      eyebrow="Donor reporting"
      title="Reports"
      description="Generate donor-ready reports from structured records, then save Docs and PDFs back to Google Drive."
      action={<button className="button button--primary">Generate report</button>}
    >
      <section className="workspace-card">
        <DataTable columns={["Code", "Report", "Status", "Blocker"]} rows={reportRows} />
      </section>
    </AppFrame>
  );
}
