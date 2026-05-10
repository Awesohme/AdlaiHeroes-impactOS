import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { EvidenceCreateForm } from "@/components/evidence/evidence-create-form";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

const uploadSteps = [
  "Capture the evidence metadata record first.",
  "Attach the Google Drive file ID and folder path once storage rules are confirmed.",
  "Set verification and consent status before report linking.",
];

export default async function NewEvidencePage() {
  const programmes = await getProgrammes();

  return (
    <AppFrame
      eyebrow="Evidence library"
      title="Upload evidence"
      description="Start the evidence metadata record now, then connect the actual Google Drive file and verification workflow in the next step."
      action={
        <Link className="button button--ghost program-action" href="/evidence" prefetch={false}>
          Back to Evidence
        </Link>
      }
    >
      <section className="content-grid">
        <article className="workspace-card">
          <div className="programmes-toolbar">
            <div>
              <p className="eyebrow">Draft record</p>
              <h2>Create evidence metadata</h2>
            </div>
          </div>
          <EvidenceCreateForm programmes={programmes.rows} />
        </article>

        <aside className="workspace-card programmes-sidecard">
          <div>
            <p className="eyebrow">Build order</p>
            <h2>What happens next</h2>
          </div>
          <div className="status-stack">
            {uploadSteps.map((step, index) => (
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
            <p>Run the evidence write policy SQL before first submission so the signed-in admin can save real metadata records.</p>
            <p>SQL file: <code>supabase/evidence-write-policies.sql</code></p>
          </div>
        </aside>
      </section>
    </AppFrame>
  );
}
