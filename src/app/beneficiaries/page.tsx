import { AppFrame } from "@/components/app-frame";
import { DataTable } from "@/components/data-table";
import { beneficiaryRows } from "@/lib/sample-records";

export default function BeneficiariesPage() {
  return (
    <AppFrame
      eyebrow="Beneficiary registry"
      title="Beneficiaries"
      description="One clean beneficiary record per person, with consent, programme history, and safeguarding visibility."
      action={<button className="button button--primary">Add beneficiary</button>}
    >
      <section className="workspace-card">
        <DataTable columns={["Code", "Name", "Programme", "Consent", "Safeguarding"]} rows={beneficiaryRows} />
      </section>
    </AppFrame>
  );
}
