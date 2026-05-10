import Link from "next/link";
import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";
import { getProgrammeByCode } from "@/lib/programmes";

export const dynamic = "force-dynamic";

export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ programmeCode: string }>;
}) {
  const { programmeCode } = await params;
  const result = await getProgrammeByCode(programmeCode);

  if (!result.programme) {
    notFound();
  }

  return (
    <AppFrame
      eyebrow="Programmes"
      title="Edit Programme"
      description="Refine the programme setup, data fields, and module access without breaking the links to beneficiaries, activities, and evidence."
      action={
        <Link className="button button--ghost" href="/programmes" prefetch={false}>
          Back to Programmes
        </Link>
      }
    >
      <ProgrammeCreateForm initialProgramme={result.programme} mode="edit" />
    </AppFrame>
  );
}
