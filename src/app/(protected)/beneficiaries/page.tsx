import { AppFrame } from "@/components/app-frame";
import { BeneficiariesOverview } from "@/components/beneficiaries/beneficiaries-overview";
import { getBeneficiaries } from "@/lib/beneficiaries";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage() {
  const programmes = await getProgrammes();
  const beneficiaries = await getBeneficiaries(programmes.rows);

  return (
    <AppFrame
      eyebrow="Beneficiary registry"
      title="Beneficiaries"
      description="Search, review, and manage beneficiary profiles with programme-aware filters, consent visibility, and safeguarding context."
    >
      <BeneficiariesOverview
        error={beneficiaries.error}
        programmes={programmes.rows}
        rows={beneficiaries.rows}
        source={beneficiaries.source}
      />
    </AppFrame>
  );
}
