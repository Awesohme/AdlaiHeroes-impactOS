import { AppFrame } from "@/components/app-frame";
import { EvidenceOverview } from "@/components/evidence/evidence-overview";
import { getEvidenceRecords } from "@/lib/evidence";

export const dynamic = "force-dynamic";

export default async function EvidencePage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const evidence = await getEvidenceRecords();

  return (
    <AppFrame
      eyebrow="Evidence library"
      title="Evidence"
      description="Google Drive stores the files; Supabase stores the metadata, verification state, and report links."
      action={<a className="button button--primary" href="/evidence/new">Upload evidence</a>}
    >
      <EvidenceOverview
        created={params.created === "1"}
        error={evidence.error}
        rows={evidence.rows}
        source={evidence.source}
      />
    </AppFrame>
  );
}
