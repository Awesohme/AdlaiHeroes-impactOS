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

      <section className="dashboard-metrics">
        <article className="dashboard-metric-card">
          <span>Total evidence</span>
          <strong>{metrics.total}</strong>
          <p>Metadata records linked back to Drive.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Verified</span>
          <strong>{metrics.verified}</strong>
          <p>Ready for outward-facing use.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>In review</span>
          <strong>{metrics.review}</strong>
          <p>Still waiting on operational review.</p>
        </article>
        <article className="dashboard-metric-card dashboard-metric-card--risk">
          <span>Consent check</span>
          <strong>{metrics.consent}</strong>
          <p>Do not reuse until consent is confirmed.</p>
        </article>
      </section>

      <section className="portfolio-grid">
        <article className="workspace-card portfolio-panel">
          <div className="compact-card__header">
            <h2>Evidence register</h2>
            <Link className="row-link" href="/evidence/new" prefetch={false}>
              Upload next
            </Link>
          </div>

          <div className="portfolio-table">
            <div className="portfolio-table__head portfolio-table__head--evidence">
              <span>Evidence</span>
              <span>Linked record</span>
              <span>Type</span>
              <span>Uploaded by</span>
              <span>Status</span>
              <span>Storage</span>
            </div>
            {rows.map((record) => (
              <article className="portfolio-row portfolio-row--evidence" key={record.code}>
                <div>
                  <strong>{record.title}</strong>
                  <p>{record.code}</p>
                </div>
                <div>
                  <p>{record.linkedRecord}</p>
                </div>
                <div>
                  <span className="type-chip">{record.fileType}</span>
                </div>
                <div>
                  <p>{record.uploadedBy}</p>
                </div>
                <div>
                  <span className={`status-pill status-pill--${evidenceTone(record.status)}`}>{record.status}</span>
                </div>
                <div>
                  <p>{record.storage}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="portfolio-side">
          <article className="workspace-card insight-card insight-card--compact">
            <div className="insight-card__header">
              <h2>Selected record</h2>
            </div>
            <div className="distribution-list">
              <div className="distribution-row">
                <span>Title</span>
                <strong>{selected?.title || "No evidence yet"}</strong>
              </div>
              <div className="distribution-row">
                <span>Folder</span>
                <strong>{selected?.folder || "No folder yet"}</strong>
              </div>
              <div className="distribution-row">
                <span>Blocker</span>
                <strong>{selected?.blocker || "Upload the first record"}</strong>
              </div>
              <div className="distribution-row">
                <span>Status</span>
                <strong>{selected?.status || "Pending"}</strong>
              </div>
            </div>
            <p className="insight-note">
              Keep this screen focused on finding files, checking status, and jumping back into the upload flow.
            </p>
          </article>
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
