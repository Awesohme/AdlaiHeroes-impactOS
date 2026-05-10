import Link from "next/link";
import { AppFrame } from "@/components/app-frame";

export const dynamic = "force-dynamic";

const uploadSteps = [
  "Capture the evidence metadata record first.",
  "Attach the Google Drive file ID and folder path once storage rules are confirmed.",
  "Set verification and consent status before report linking.",
];

export default function NewEvidencePage() {
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
              <h2>First-pass upload flow</h2>
            </div>
          </div>

          <form className="programme-form">
            <label>
              <span>Evidence title</span>
              <input placeholder="School nomination letters" type="text" />
            </label>
            <label>
              <span>Evidence code</span>
              <input placeholder="EVD-2026-0004" type="text" />
            </label>
            <label>
              <span>Evidence type</span>
              <select defaultValue="Document">
                <option>Document</option>
                <option>Photo</option>
                <option>Video</option>
                <option>Attendance</option>
              </select>
            </label>
            <label>
              <span>Verification status</span>
              <select defaultValue="In review">
                <option>In review</option>
                <option>Verified</option>
                <option>Consent check</option>
              </select>
            </label>
            <label className="programme-form__full">
              <span>Drive folder path</span>
              <input placeholder="Programme evidence / Education / Nominations" type="text" />
            </label>
          </form>
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
            <h2>Metadata first</h2>
            <p>
              This upload screen is intentionally structural. The next slice should wire Drive IDs, linked programme/activity/beneficiary records, and verification updates.
            </p>
          </div>
        </aside>
      </section>
    </AppFrame>
  );
}
