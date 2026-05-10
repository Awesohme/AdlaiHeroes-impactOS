import Link from "next/link";
import { AppFrame } from "@/components/app-frame";

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
              <h2>First-pass create flow</h2>
            </div>
          </div>

          <form className="programme-form">
            <label>
              <span>Programme name</span>
              <input placeholder="Education Sponsorship 2027" type="text" />
            </label>
            <label>
              <span>Programme code</span>
              <input placeholder="PRG-2027-0001" type="text" />
            </label>
            <label>
              <span>Programme type</span>
              <select defaultValue="Education Support">
                <option>Education Support</option>
                <option>Health &amp; WASH</option>
                <option>Food Support</option>
                <option>Livelihood Support</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select defaultValue="Planned">
                <option>Planned</option>
                <option>Active</option>
                <option>Monitoring</option>
              </select>
            </label>
            <label className="programme-form__full">
              <span>Notes</span>
              <textarea placeholder="Short operational note, donor context, or launch readiness summary." rows={5} />
            </label>
          </form>
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
            <h2>UI scaffold only</h2>
            <p>This create screen is the structural shell for the next slice. Submission wiring comes immediately after the Programmes list polish.</p>
          </div>
        </aside>
      </section>
    </AppFrame>
  );
}
