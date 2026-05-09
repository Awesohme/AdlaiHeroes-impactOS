import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { activityRows } from "@/lib/sample-records";

export default function ActivitiesPage() {
  return (
    <AppFrame
      eyebrow="Field operations"
      title="Activities"
      description="Plan field activities, log attendance, and make evidence collection part of the normal workflow."
      action={<button className="button button--primary">Log activity</button>}
    >
      <section className="workspace-card">
        <DataTable columns={["Code", "Activity", "Programme", "Status", "Evidence"]} rows={activityRows} />
      </section>
    </AppFrame>
  );
}
