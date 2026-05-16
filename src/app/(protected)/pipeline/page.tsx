import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProgrammes, getProgrammeStageAvailability } from "@/lib/programmes";
import {
  listEnrolmentsByProgrammeAction,
  listStagesAction,
} from "@/app/(protected)/programmes/actions";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { usesEducationScorecard } from "@/lib/programme-pipeline";

export const revalidate = 30;

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
    const stageAvailability = await getProgrammeStageAvailability(
      programmes.map((programme) => programme.id).filter((id): id is string => Boolean(id)),
    );
    selected =
      programmes.find((programme) => programme.id && (stageAvailability.get(programme.id) ?? 0) > 0) ??
      null;
    if (!selected) selected = programmes[0];
  }

  const [stages, enrolments] = selected?.id
    ? await Promise.all([
        listStagesAction(selected.id),
        listEnrolmentsByProgrammeAction(selected.id),
      ])
    : [[], []];

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
        scorecardEnabled={usesEducationScorecard(selected?.pipeline_template_key)}
      />
    </AppFrame>
  );
}
