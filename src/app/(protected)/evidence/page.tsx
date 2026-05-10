import { AppFrame } from "@/components/app-frame";
import { EvidenceOverview } from "@/components/evidence/evidence-overview";

export const dynamic = "force-dynamic";

export default function EvidencePage() {
  return (
    <AppFrame
      eyebrow="Evidence library"
      title="Evidence"
      description="Google Drive stores the files; Supabase stores the metadata, verification state, and report links."
      action={<a className="button button--primary" href="/evidence/new">Upload evidence</a>}
    >
      <EvidenceOverview />
    </AppFrame>
  );
}
