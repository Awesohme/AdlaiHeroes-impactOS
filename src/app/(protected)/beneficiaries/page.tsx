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
      eyebrow="Registry"
      title="Beneficiaries"
      description="Search, review, and follow up on beneficiary records with programme-aware filters."
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
