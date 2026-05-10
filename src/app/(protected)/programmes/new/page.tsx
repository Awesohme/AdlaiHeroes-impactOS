import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";

export const dynamic = "force-dynamic";

export default function NewProgrammePage() {
  return (
    <AppFrame
      eyebrow="Programmes"
      title="Create Programme"
      description="Set up the programme details, module stack, and required data fields before beneficiaries, activities, and evidence start flowing in."
      action={
        <Link className="button button--ghost" href="/programmes" prefetch={false}>
          Back to Programmes
        </Link>
      }
    >
      <ProgrammeCreateForm mode="create" />
    </AppFrame>
  );
}
