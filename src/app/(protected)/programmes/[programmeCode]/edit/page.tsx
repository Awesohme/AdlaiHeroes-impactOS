import Link from "next/link";
import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";
import { getProgrammeByCode } from "@/lib/programmes";
import { getFieldTemplates } from "@/lib/field-templates";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ programmeCode: string }>;
}) {
  const { programmeCode } = await params;
  const [result, fieldCatalog] = await Promise.all([
    getProgrammeByCode(programmeCode),
    getFieldTemplates(),
  ]);

  if (!result.programme) {
    notFound();
  }

  return (
    <AppFrame
      eyebrow="Programmes"
      title="Edit programme"
      description="Refine setup, fields, and modules without breaking links to beneficiaries or evidence."
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/programmes" prefetch={false}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      }
    >
      <ProgrammeCreateForm initialProgramme={result.programme} mode="edit" fieldCatalog={fieldCatalog} />
    </AppFrame>
  );
}
