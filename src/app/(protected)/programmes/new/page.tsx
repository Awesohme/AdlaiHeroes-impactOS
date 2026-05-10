import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewProgrammePage() {
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
      <ProgrammeCreateForm mode="create" />
    </AppFrame>
  );
}
