import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { EvidenceCreateForm } from "@/components/evidence/evidence-create-form";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

const uploadSteps = [
  "Choose the linked programme so Drive routing has the right folder anchor.",
  "Upload the actual evidence file directly inside ImpactOps.",
  "Let the app create or reuse the programme folder and save metadata automatically.",
];

export default async function NewEvidencePage() {
  const programmes = await getProgrammes();

  return (
    <AppFrame
      eyebrow="Evidence library"
      title="Upload evidence"
      description="Upload the real evidence file here, route it into the correct Google Drive programme folder, and save the linked metadata record in one step."
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
              <p className="eyebrow">Automated upload</p>
              <h2>Create and route evidence</h2>
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
            <h2>Drive routing rule</h2>
            <p>ImpactOps now uses the linked programme as the routing anchor, stores files in Google Drive, and keeps only the file metadata in Supabase.</p>
            <p>Programmes cache their Drive folder ID after the first upload so future evidence lands in the same place automatically.</p>
          </div>
        </aside>
      </section>
    </AppFrame>
  );
}
