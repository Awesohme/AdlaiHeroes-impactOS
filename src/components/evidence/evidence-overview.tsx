import Link from "next/link";
import type { EvidenceRow } from "@/lib/evidence";

export function EvidenceOverview({
  rows,
  source,
  error,
  created,
}: {
  rows: EvidenceRow[];
  source: "supabase" | "mock";
  error?: string;
  created?: boolean;
}) {
  const metrics = {
    total: rows.length,
    verified: rows.filter((item) => item.status === "Verified").length,
    review: rows.filter((item) => item.status === "In review").length,
    consent: rows.filter((item) => item.status === "Consent check").length,
  };
  const selected = rows[0];

  return (
    <>
      {created ? (
        <div className="data-banner data-banner--live">
          <strong>Evidence uploaded.</strong>
          <span>The file reached Google Drive and the metadata record was saved to Supabase.</span>
        </div>
      ) : null}

      <div className={`data-banner ${source === "supabase" ? "data-banner--live" : ""}`}>
        <strong>{source === "supabase" ? "Live metadata active." : "Metadata workspace active."}</strong>
        <span>
          {source === "supabase"
            ? "The register below is loading from Supabase while files remain in Google Drive."
            : error || "The file system stays in Google Drive; this screen is shaping the metadata, verification, and linkage workflow first."}
        </span>
      </div>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total evidence records</span>
          <strong>{metrics.total}</strong>
          <p>Structured metadata entries that can be referenced in reports, audits, and programme reviews.</p>
        </article>
        <article className="metric-card">
          <span>Verified</span>
          <strong>{metrics.verified}</strong>
          <p>Evidence already cleared for donor-facing outputs and formal reporting.</p>
        </article>
        <article className="metric-card">
          <span>Needs review</span>
          <strong>{metrics.review}</strong>
          <p>Records waiting on operational or M&amp;E review before they are treated as complete.</p>
        </article>
        <article className="metric-card">
          <span>Consent checks</span>
          <strong>{metrics.consent}</strong>
          <p>Media-linked records that should not move into reports until consent status is fully confirmed.</p>
        </article>
      </section>

      <section className="programmes-grid">
        <article className="workspace-card">
          <div className="programmes-toolbar">
            <div>
              <p className="eyebrow">Evidence register</p>
              <h2>Verification queue</h2>
            </div>
            <div className="filter-strip" aria-label="Evidence filters">
              <button className="filter-pill filter-pill--active" type="button">
                All
              </button>
              <button className="filter-pill filter-pill--active" type="button">
                Verified
                <span>{metrics.verified}</span>
              </button>
              <button className="filter-pill filter-pill--monitoring" type="button">
                In review
                <span>{metrics.review}</span>
              </button>
              <button className="filter-pill filter-pill--planned" type="button">
                Consent check
                <span>{metrics.consent}</span>
              </button>
            </div>
          </div>

          <div className="evidence-stack">
            {rows.map((record) => (
              <article className="evidence-card" key={record.code}>
                <div className="evidence-card__head">
                  <div>
                    <strong>{record.title}</strong>
                    <p>{record.code}</p>
                  </div>
                  <span className={`status-pill status-pill--${evidenceTone(record.status)}`}>{record.status}</span>
                </div>
                <div className="evidence-card__grid">
                  <div>
                    <span>Linked record</span>
                    <p>{record.linkedRecord}</p>
                  </div>
                  <div>
                    <span>Storage</span>
                    <p>{record.storage}</p>
                  </div>
                  <div>
                    <span>File type</span>
                    <p>{record.fileType}</p>
                  </div>
                  <div>
                    <span>Uploaded by</span>
                    <p>{record.uploadedBy}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="workspace-card programmes-sidecard">
          <div>
            <p className="eyebrow">Selected record</p>
            <h2>{selected?.title || "No evidence yet"}</h2>
          </div>
          <div className="status-stack">
            <div className="status-stack__row">
              <div>
                <strong>Drive folder</strong>
                <p>{selected?.folder || "No folder yet"}</p>
              </div>
              <span className="status-pill status-pill--active">Stored</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Current blocker</strong>
                <p>{selected?.blocker || "Upload the first record"}</p>
              </div>
              <span className="status-pill status-pill--planned">Needs action</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Recommended next step</strong>
                <p>
                  {selected?.status === "Consent check"
                    ? "Confirm consent status before linking this media into outward-facing reports."
                    : selected?.status === "In review"
                      ? "Finish operational review so this evidence can support reporting."
                      : "Use verified evidence records in donor reports and audit exports."}
                </p>
              </div>
              <span className="status-pill status-pill--monitoring">Review</span>
            </div>
          </div>
          <div className="workspace-card programmes-note">
            <p className="eyebrow">Next action</p>
            <h2>Upload next evidence</h2>
            <p>Add the next file, verification state, and programme linkage without leaving the app.</p>
            <Link className="button button--primary" href="/evidence/new" prefetch={false}>
              Open upload flow
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}

function evidenceTone(status: string) {
  if (status === "Verified") {
    return "active";
  }

  if (status === "In review") {
    return "monitoring";
  }

  return "planned";
}
