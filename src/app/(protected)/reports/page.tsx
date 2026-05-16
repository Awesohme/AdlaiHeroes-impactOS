import { AppFrame } from "@/components/app-frame";
import { ReportsOverview } from "@/components/reports/reports-overview";
import { getCurrentProfile } from "@/lib/auth";
import { getProgrammes } from "@/lib/programmes";
import { listProgrammeReports } from "@/lib/reports";

export const revalidate = 45;

export default async function ReportsPage() {
  const [reports, programmesResult, profile] = await Promise.all([
    listProgrammeReports(),
    getProgrammes({ archiveScope: "all" }),
    getCurrentProfile(),
  ]);

  const programmeOptions = programmesResult.rows.map((programme) => ({
    value: programme.id ?? programme.programme_code,
    label: `${programme.name} (${programme.programme_code})`,
  }));

  return (
    <AppFrame
      eyebrow="Donor reporting"
      title="Reports"
      description="Generate, track, and open programme reports stored in Google Drive."
    >
      <ReportsOverview
        initialReports={reports}
        programmeOptions={programmeOptions}
        canManageOps={Boolean(profile?.is_active && profile.role !== "viewer")}
      />
    </AppFrame>
  );
}
