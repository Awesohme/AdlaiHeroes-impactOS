type BeneficiaryRecord = {
  code: string;
  name: string;
  programme: string;
  consent: string;
  safeguarding: string;
  location: string;
  guardian: string;
  focus: string;
};

const beneficiaryRecords: BeneficiaryRecord[] = [
  {
    code: "BEN-2026-0001",
    name: "Maryam Bello",
    programme: "Education Sponsorship 2026",
    consent: "Consent recorded",
    safeguarding: "No flag",
    location: "Agege, Lagos",
    guardian: "Hauwa Bello",
    focus: "School fees and CBT readiness",
  },
  {
    code: "BEN-2026-0002",
    name: "Aisha Musa",
    programme: "Girls Dignity Outreach",
    consent: "Photo consent pending",
    safeguarding: "Follow-up needed",
    location: "Ikorodu, Lagos",
    guardian: "Musa Ibrahim",
    focus: "Menstrual health support and follow-up",
  },
  {
    code: "BEN-2026-0003",
    name: "Daniel Okoro",
    programme: "Education Sponsorship 2026",
    consent: "Consent recorded",
    safeguarding: "No flag",
    location: "Surulere, Lagos",
    guardian: "Grace Okoro",
    focus: "Exam registration and attendance tracking",
  },
];

export function BeneficiariesOverview() {
  const metrics = {
    total: beneficiaryRecords.length,
    consentBlocked: beneficiaryRecords.filter((item) => item.consent.toLowerCase().includes("pending")).length,
    flagged: beneficiaryRecords.filter((item) => item.safeguarding.toLowerCase().includes("follow")).length,
    programmes: new Set(beneficiaryRecords.map((item) => item.programme)).size,
  };

  return (
    <>
      <div className="data-banner">
        <strong>Registry prototype active.</strong>
        <span>Beneficiaries are still using the vetted sample dataset while we wire the secure create and enrolment flow.</span>
      </div>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total beneficiaries</span>
          <strong>{metrics.total}</strong>
          <p>One structured record per person before attendance, evidence, or reporting links are created.</p>
        </article>
        <article className="metric-card">
          <span>Consent follow-ups</span>
          <strong>{metrics.consentBlocked}</strong>
          <p>Records that still need media or document consent confirmation before full evidence use.</p>
        </article>
        <article className="metric-card">
          <span>Safeguarding watch</span>
          <strong>{metrics.flagged}</strong>
          <p>Profiles that need human review before broader operational access is expanded.</p>
        </article>
        <article className="metric-card">
          <span>Linked programmes</span>
          <strong>{metrics.programmes}</strong>
          <p>Beneficiary records are already grouped around the programmes currently live in the workspace.</p>
        </article>
      </section>

      <section className="programmes-grid">
        <article className="workspace-card">
          <div className="programmes-toolbar">
            <div>
              <p className="eyebrow">Registry view</p>
              <h2>Beneficiary register</h2>
            </div>
            <div className="filter-strip" aria-label="Beneficiary filters">
              <button className="filter-pill filter-pill--active" type="button">
                All
              </button>
              <button className="filter-pill filter-pill--planned" type="button">
                Consent follow-up
                <span>{metrics.consentBlocked}</span>
              </button>
              <button className="filter-pill filter-pill--monitoring" type="button">
                Safeguarding watch
                <span>{metrics.flagged}</span>
              </button>
            </div>
          </div>

          <div className="programme-table">
            <div className="beneficiary-table__head">
              <span>Beneficiary</span>
              <span>Programme</span>
              <span>Consent</span>
              <span>Safeguarding</span>
            </div>
            {beneficiaryRecords.map((record) => (
              <article className="programme-row" key={record.code}>
                <div>
                  <strong>{record.name}</strong>
                  <p>{record.code}</p>
                </div>
                <div>
                  <span className="programme-type">{record.programme}</span>
                </div>
                <div>
                  <span className={`status-pill status-pill--${consentTone(record.consent)}`}>{record.consent}</span>
                </div>
                <div>
                  <span className={`status-pill status-pill--${safeguardingTone(record.safeguarding)}`}>{record.safeguarding}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="workspace-card programmes-sidecard">
          <div>
            <p className="eyebrow">Selected profile</p>
            <h2>{beneficiaryRecords[1].name}</h2>
          </div>
          <div className="status-stack">
            <div className="status-stack__row">
              <div>
                <strong>Guardian</strong>
                <p>{beneficiaryRecords[1].guardian}</p>
              </div>
              <span className="status-pill status-pill--active">Primary</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Location</strong>
                <p>{beneficiaryRecords[1].location}</p>
              </div>
              <span className="status-pill status-pill--planned">Field</span>
            </div>
            <div className="status-stack__row">
              <div>
                <strong>Programme focus</strong>
                <p>{beneficiaryRecords[1].focus}</p>
              </div>
              <span className="status-pill status-pill--monitoring">Active</span>
            </div>
          </div>
          <div className="workspace-card programmes-note">
            <p className="eyebrow">Next action</p>
            <h2>Secure intake flow</h2>
            <p>
              The next beneficiary slice should add controlled creation, programme enrolment, and consent capture without widening access to sensitive records.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

function consentTone(consent: string) {
  return consent.toLowerCase().includes("pending") ? "planned" : "active";
}

function safeguardingTone(safeguarding: string) {
  return safeguarding.toLowerCase().includes("follow") ? "monitoring" : "active";
}
