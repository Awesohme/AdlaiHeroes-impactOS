import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";
import { ChevronLeft } from "lucide-react";
import { getFieldTemplates } from "@/lib/field-templates";
import { getProgrammeTypes } from "@/lib/programme-types";

export const dynamic = "force-dynamic";

export default async function NewProgrammePage() {
  const [fieldCatalog, programmeTypes] = await Promise.all([
    getFieldTemplates(),
    getProgrammeTypes(),
  ]);
  return (
    <AppFrame
      eyebrow="Programmes"
      title="New programme"
      description="Set up details, modules, and required data fields before beneficiaries and evidence start flowing in."
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/programmes" prefetch={false}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      }
    >
      <ProgrammeCreateForm
        mode="create"
        fieldCatalog={fieldCatalog}
        programmeTypes={programmeTypes.map((type) => type.name)}
      />
    </AppFrame>
  );
}
