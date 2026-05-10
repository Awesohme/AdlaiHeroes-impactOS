import Link from "next/link";
import type { ProgrammeRow } from "@/lib/programmes";

export function ProgrammesOverview({
  rows,
  source,
  error,
}: {
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}) {
  const totals = getProgrammeMetrics(rows);
  const types = summarizeTypes(rows);
  const statusCards = [
    { label: "Active", value: totals.active, tone: "active" },
    { label: "Monitoring", value: totals.monitoring, tone: "monitoring" },
    { label: "Planned", value: totals.planned, tone: "planned" },
  ];

  return (
    <>
      {source === "mock" ? (
        <div className="data-banner">
          <strong>Mock data active.</strong>
          <span>{error ?? "Connect Supabase and add records to switch this table live."}</span>
        </div>
      ) : (
        <div className="data-banner data-banner--live">
          <strong>Live Supabase data.</strong>
          <span>This workspace is reading the `programmes` table with the signed-in session.</span>
        </div>
      )}

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total programmes</span>
          <strong>{rows.length}</strong>
          <p>Structured records ready for activities, evidence, and reporting.</p>
        </article>
        <article className="metric-card">
          <span>Active reach</span>
          <strong>{totals.activeReach}</strong>
          <p>Current estimated beneficiary reach across active live programmes.</p>
        </article>
        <article className="metric-card">
          <span>Programme types</span>
          <strong>{types.length}</strong>
          <p>{types.slice(0, 2).map((item) => item.label).join(" • ") || "No categories yet"}</p>
        </article>
        <article className="metric-card">
          <span>Operational stance</span>
          <strong>{totals.monitoring > 0 ? "Mixed" : "Stable"}</strong>
          <p>Use the create flow to start new records before adding people or evidence.</p>
        </article>
      </section>

      <section className="programmes-grid">
        <article className="workspace-card">
          <div className="programmes-toolbar">
            <div>
              <p className="eyebrow">Portfolio view</p>
              <h2>Programme register</h2>
            </div>
            <div className="filter-strip" aria-label="Programme status filters">
              <button className="filter-pill filter-pill--active" type="button">
                All
              </button>
              {statusCards.map((status) => (
                <button className={`filter-pill filter-pill--${status.tone}`} key={status.label} type="button">
                  {status.label}
                  <span>{status.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="programme-table">
            <div className="programme-table__head">
              <span>Programme</span>
              <span>Type</span>
              <span>Status</span>
              <span>Reach</span>
            </div>
            {rows.map((row) => (
              <article className="programme-row" key={row.programme_code}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.programme_code}</p>
                </div>
                <div>
                  <span className="programme-type">{row.programme_type}</span>
                </div>
                <div>
                  <span className={`status-pill status-pill--${statusTone(row.status)}`}>{row.status}</span>
                </div>
                <div>
                  <strong>{row.reach}</strong>
                  <p>{source === "supabase" ? "Live record" : "Prototype dataset"}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="workspace-card programmes-sidecard">
          <div>
            <p className="eyebrow">At a glance</p>
            <h2>Operational balance</h2>
          </div>
          <div className="status-stack">
            {statusCards.map((status) => (
              <div className="status-stack__row" key={status.label}>
                <div>
                  <strong>{status.label}</strong>
                  <p>{statusMessage(status.label)}</p>
                </div>
                <span className={`status-pill status-pill--${status.tone}`}>{status.value}</span>
              </div>
            ))}
          </div>
          <div className="workspace-card programmes-note">
            <p className="eyebrow">Next action</p>
            <h2>Create with discipline</h2>
            <p>
              Start a new programme record before adding beneficiaries, activities, or evidence so reporting stays linked from day one.
            </p>
            <Link className="button button--primary" href="/programmes/new" prefetch={false}>
              Open create flow
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}

function getProgrammeMetrics(rows: ProgrammeRow[]) {
  const active = rows.filter((row) => statusTone(row.status) === "active").length;
  const monitoring = rows.filter((row) => statusTone(row.status) === "monitoring").length;
  const planned = rows.filter((row) => statusTone(row.status) === "planned").length;
  const activeReach = rows
    .filter((row) => statusTone(row.status) === "active")
    .reduce((total, row) => total + parseReach(row.reach), 0);

  return {
    active,
    monitoring,
    planned,
    activeReach: activeReach > 0 ? `${activeReach}` : "0",
  };
}

function summarizeTypes(rows: ProgrammeRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    counts.set(row.programme_type, (counts.get(row.programme_type) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function parseReach(reach: string) {
  const match = reach.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("active")) {
    return "active";
  }

  if (normalized.includes("monitor")) {
    return "monitoring";
  }

  return "planned";
}

function statusMessage(status: string) {
  if (status === "Active") {
    return "Already in delivery and should have evidence flowing in.";
  }

  if (status === "Monitoring") {
    return "Live but still being tightened for reporting discipline.";
  }

  return "Configured or queued before field execution starts.";
}
