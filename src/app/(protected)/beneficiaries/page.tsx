import { AppFrame } from "@/components/app-frame";
import { BeneficiariesOverview } from "@/components/beneficiaries/beneficiaries-overview";

export const dynamic = "force-dynamic";

export default function BeneficiariesPage() {
  return (
    <AppFrame
      eyebrow="Beneficiary registry"
      title="Beneficiaries"
      description="One clean beneficiary record per person, with consent, programme history, and safeguarding visibility."
      action={<button className="button button--primary">Add beneficiary</button>}
    >
      <BeneficiariesOverview />
    </AppFrame>
  );
}
