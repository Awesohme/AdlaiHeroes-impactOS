import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { EvidenceOverview } from "@/components/evidence/evidence-overview";
import { getEvidenceRecords } from "@/lib/evidence";
import { Upload } from "lucide-react";

export const revalidate = 30;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const evidence = await getEvidenceRecords();

  return (
    <AppFrame
      eyebrow="Library"
      title="Evidence"
      description="Drive stores files; Supabase stores metadata, verification, and report links."
      action={
        <Button size="sm" asChild>
          <Link href="/evidence/new" prefetch={false}>
            <Upload className="h-4 w-4" /> Upload
          </Link>
        </Button>
      }
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
