import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { EvidenceCreateForm } from "@/components/evidence/evidence-create-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgrammes } from "@/lib/programmes";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const uploadSteps = [
  "Choose the linked programme so Drive routing has the right folder anchor.",
  "Upload the actual evidence file directly inside ImpactOps.",
  "The app creates or reuses the programme folder and saves metadata automatically.",
];

export default async function NewEvidencePage() {
  const programmes = await getProgrammes();

  return (
    <AppFrame
      eyebrow="Library"
      title="Upload evidence"
      description="Send the file to Drive and save the metadata record in one step."
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/evidence" prefetch={false}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <EvidenceCreateForm programmes={programmes.rows} />

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploadSteps.map((step, index) => (
                <div key={step} className="flex gap-3 text-sm">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <p className="text-muted-foreground">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Drive routing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                The linked programme is the routing anchor. Files live in Drive; only metadata stays
                in Supabase.
              </p>
              <p>
                Programmes cache their Drive folder ID after the first upload — future evidence
                lands in the same place.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppFrame>
  );
}
