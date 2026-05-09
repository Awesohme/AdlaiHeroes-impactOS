import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { evidenceRows } from "@/lib/sample-records";

export default function EvidencePage() {
  return (
    <AppFrame
      eyebrow="Evidence library"
      title="Evidence"
      description="Google Drive stores the files; Supabase stores the metadata, verification state, and report links."
      action={<button className="button button--primary">Upload evidence</button>}
    >
      <section className="workspace-card">
        <DataTable columns={["Code", "Title", "Storage", "Status", "Linked record"]} rows={evidenceRows} />
      </section>
    </AppFrame>
  );
}
