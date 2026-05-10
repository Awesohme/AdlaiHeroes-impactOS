import Link from "next/link";

type EvidenceRecord = {
  code: string;
  title: string;
  storage: string;
  status: string;
  linkedRecord: string;
  uploadedBy: string;
  fileType: string;
  folder: string;
  blocker: string;
};

const evidenceRecords: EvidenceRecord[] = [
  {
    code: "EVD-2026-0001",
    title: "School nomination letters",
    storage: "Google Drive",
    status: "Verified",
    linkedRecord: "Education Sponsorship 2026",
    uploadedBy: "adlaioog@gmail.com",
    fileType: "PDF bundle",
    folder: "Programme evidence / Education / Nominations",
    blocker: "None",
  },
  {
    code: "EVD-2026-0002",
    title: "Attendance sheet",
    storage: "Google Drive",
    status: "In review",
    linkedRecord: "CBT orientation",
    uploadedBy: "adlaioog@gmail.com",
    fileType: "Scanned PDF",
    folder: "Activities / CBT readiness / Attendance",
    blocker: "M&E review pending",
  },
  {
    code: "EVD-2026-0003",
    title: "Distribution photos",
    storage: "Google Drive",
    status: "Consent check",
    linkedRecord: "Girls Dignity Outreach",
    uploadedBy: "adlaioog@gmail.com",
    fileType: "JPEG batch",
    folder: "Programme evidence / Girls Dignity / Photos",
    blocker: "Photo consent confirmation required",
  },
];

export function EvidenceOverview() {
  const metrics = {
    total: evidenceRecords.length,
    verified: evidenceRecords.filter((item) => item.status === "Verified").length,
    review: evidenceRecords.filter((item) => item.status === "In review").length,
    consent: evidenceRecords.filter((item) => item.status === "Consent check").length,
  };

  return (
    <>
      <div className="data-banner">
        <strong>Metadata workspace active.</strong>
        <span>The file system stays in Google Drive; this screen is shaping the metadata, verification, and linkage workflow first.</span>
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
            {evidenceRecords.map((record) => (
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
            <h2>{evidenceRecords[2].title}</h2>
          </div>
          <div className="status-stack">
            <div className="status-stack__row">
              <div>
                <strong>Drive folder</strong>
                <p>{evidenceRecords[2].folder}</p>
              </div>
              <span className="status-pill status-pill--active">Stored</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Current blocker</strong>
                <p>{evidenceRecords[2].blocker}</p>
              </div>
              <span className="status-pill status-pill--planned">Needs action</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Recommended next step</strong>
                <p>Confirm consent status before linking this media into outward-facing reports.</p>
              </div>
              <span className="status-pill status-pill--monitoring">Review</span>
            </div>
          </div>
          <div className="workspace-card programmes-note">
            <p className="eyebrow">Next action</p>
            <h2>Upload metadata shell</h2>
            <p>Start the metadata entry flow first, then connect it to Drive folder rules and file IDs in the next slice.</p>
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
