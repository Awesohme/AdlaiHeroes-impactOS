import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProgrammes } from "@/lib/programmes";
import {
  listEnrolmentsByProgrammeAction,
  listStagesAction,
} from "@/app/(protected)/programmes/actions";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ programme?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const programmesResult = await getProgrammes();
  const programmes = programmesResult.rows;

  if (programmes.length === 0) {
    return (
      <AppFrame
        eyebrow="Operations"
        title="Pipeline"
        description="Process a programme's beneficiaries through their stages without leaving the page."
      >
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No programmes yet.</p>
            <Button asChild>
              <Link href="/programmes/new">Create a programme</Link>
            </Button>
          </CardContent>
        </Card>
      </AppFrame>
    );
  }

  // Find the selected programme by code; default to the first with stages
  let selected = programmes.find((p) => p.programme_code === params.programme) ?? null;

  if (!selected) {
    for (const p of programmes) {
      if (!p.id) continue;
      const stages = await listStagesAction(p.id);
      if (stages.length > 0) {
        selected = p;
        break;
      }
    }
    if (!selected) selected = programmes[0];
  }

  const stages = selected?.id ? await listStagesAction(selected.id) : [];
  const enrolments = selected?.id ? await listEnrolmentsByProgrammeAction(selected.id) : [];

  return (
    <AppFrame
      eyebrow="Operations"
      title="Pipeline"
      description="Process a programme's beneficiaries through their stages without leaving the page."
    >
      <PipelineBoard
        programmes={programmes.map((p) => ({
          id: p.id ?? null,
          code: p.programme_code,
          name: p.name,
        }))}
        selectedCode={selected?.programme_code ?? null}
        stages={stages}
        enrolments={enrolments}
      />
    </AppFrame>
  );
}
