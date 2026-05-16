import { AppFrame } from "@/components/app-frame";
import { BeneficiariesOverview } from "@/components/beneficiaries/beneficiaries-overview";
import { getBeneficiaries } from "@/lib/beneficiaries";
import { getProgrammes } from "@/lib/programmes";

export const revalidate = 30;

export default async function BeneficiariesPage() {
  const [programmes, beneficiaries] = await Promise.all([getProgrammes(), getBeneficiaries()]);

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
