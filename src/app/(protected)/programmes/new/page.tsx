import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { ProgrammeCreateForm } from "@/components/programmes/programme-create-form";

export const dynamic = "force-dynamic";

const draftSteps = [
  "Create the structured programme record first.",
  "Assign the delivery type and operating status.",
  "Confirm reporting ownership before beneficiary data entry.",
];

export default function NewProgrammePage() {
  return (
    <AppFrame
      eyebrow="Programme management"
      title="Create programme"
      description="Start a clean programme record now, then connect beneficiaries, activities, and evidence in the next slices."
      action={
        <Link className="button button--ghost program-action" href="/programmes" prefetch={false}>
          Back to Programmes
        </Link>
      }
    >
      <section className="content-grid">
        <article className="workspace-card">
          <div className="programmes-toolbar">
            <div>
              <p className="eyebrow">Draft record</p>
              <h2>Create a live programme</h2>
            </div>
          </div>
          <ProgrammeCreateForm />
        </article>

        <aside className="workspace-card programmes-sidecard">
          <div>
            <p className="eyebrow">Build order</p>
            <h2>What happens next</h2>
          </div>
          <div className="status-stack">
            {draftSteps.map((step, index) => (
              <div className="status-stack__row" key={step}>
                <div>
                  <strong>Step {index + 1}</strong>
                  <p>{step}</p>
                </div>
                <span className="status-pill status-pill--planned">Draft</span>
              </div>
            ))}
          </div>
          <div className="workspace-card programmes-note">
            <p className="eyebrow">Important</p>
            <h2>Write policy required</h2>
            <p>Run the programme write policy SQL before first submission so the signed-in admin can create real records through the app.</p>
            <p>SQL file: <code>supabase/programmes-write-policies.sql</code></p>
          </div>
        </aside>
      </section>
    </AppFrame>
  );
}
