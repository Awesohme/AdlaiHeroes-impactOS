import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { getBeneficiaries } from "@/lib/beneficiaries";
import { getEvidenceRecords } from "@/lib/evidence";
import { getProgrammes } from "@/lib/programmes";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const programmes = await getProgrammes();
  const evidence = await getEvidenceRecords();
  const beneficiaries = await getBeneficiaries(programmes.rows);

  const counters = [
    {
      label: "Programmes",
      value: String(programmes.rows.length),
      detail: `${programmes.rows.filter((item) => item.status === "active").length} active`,
    },
    {
      label: "Beneficiaries",
      value: String(beneficiaries.rows.length),
      detail: `${beneficiaries.rows.filter((item) => item.current_status === "active").length} active in programmes`,
    },
    {
      label: "Evidence",
      value: String(evidence.rows.length),
      detail: `${evidence.rows.filter((item) => item.status === "Verified").length} verified`,
    },
    {
      label: "Needs attention",
      value: String(
        beneficiaries.rows.filter((item) => item.risk_flag === "review").length +
          evidence.rows.filter((item) => item.status !== "Verified").length,
      ),
      detail: "Consent, review, or safeguarding follow-up",
    },
  ];

  const attentionRows = [
    ...beneficiaries.rows
      .filter((item) => item.risk_flag === "review")
      .slice(0, 3)
      .map((item) => ({
        label: item.full_name,
        meta: `${item.programme_name} • ${formatLabel(item.current_status)}`,
        action: item.safeguarding_flag === "none" ? "Review record" : "Safeguarding follow-up",
      })),
    ...evidence.rows
      .filter((item) => item.status !== "Verified")
      .slice(0, 3)
      .map((item) => ({
        label: item.title,
        meta: `${item.linkedRecord} • ${item.status}`,
        action: item.blocker,
      })),
  ].slice(0, 5);

  const recentRecords = [
    ...programmes.rows.slice(0, 2).map((item) => ({
      type: "Programme",
      title: item.name,
      detail: `${item.programme_code} • ${formatLabel(item.status)}`,
    })),
    ...beneficiaries.rows.slice(0, 2).map((item) => ({
      type: "Beneficiary",
      title: item.full_name,
      detail: `${item.beneficiary_code} • ${item.programme_name}`,
    })),
    ...evidence.rows.slice(0, 2).map((item) => ({
      type: "Evidence",
      title: item.title,
      detail: `${item.code} • ${item.status}`,
    })),
  ].slice(0, 6);

  return (
    <AppFrame
      eyebrow="Overview"
      title="ImpactOps"
      description="Use this as a light launchpad into programme setup, beneficiary tracking, and evidence review."
      action={
        <div className="page-actions">
          <Link className="button button--ghost button--compact" href="/beneficiaries" prefetch={false}>
            Add Beneficiary
          </Link>
          <Link className="button button--primary button--compact" href="/programmes/new" prefetch={false}>
            Create Programme
          </Link>
        </div>
      }
    >
      <section className="dashboard-metrics">
        {counters.map((stat) => (
          <article className="dashboard-metric-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="compact-dashboard-grid">
        <article className="workspace-card compact-card">
          <div className="compact-card__header">
            <h2>Needs attention</h2>
            <Link className="row-link" href="/evidence" prefetch={false}>
              Open Evidence
            </Link>
          </div>
          <div className="compact-list">
            {attentionRows.length ? (
              attentionRows.map((item) => (
                <div className="compact-list__row" key={`${item.label}-${item.meta}`}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.meta}</p>
                  </div>
                  <span>{item.action}</span>
                </div>
              ))
            ) : (
              <div className="compact-empty">No urgent blockers right now.</div>
            )}
          </div>
        </article>

        <article className="workspace-card compact-card">
          <div className="compact-card__header">
            <h2>Recent records</h2>
            <Link className="row-link" href="/programmes" prefetch={false}>
              Open Programmes
            </Link>
          </div>
          <div className="compact-record-table">
            {recentRecords.map((item) => (
              <div className="compact-record-table__row" key={`${item.type}-${item.title}`}>
                <div>
                  <strong>{item.type}</strong>
                  <p>{item.title}</p>
                </div>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-card compact-card compact-card--actions">
          <div className="compact-card__header">
            <h2>Quick actions</h2>
          </div>
          <div className="quick-actions">
            <Link className="quick-action" href="/programmes/new" prefetch={false}>
              <strong>Create Programme</strong>
              <span>Start a new operational record.</span>
            </Link>
            <Link className="quick-action" href="/beneficiaries" prefetch={false}>
              <strong>Open Beneficiaries</strong>
              <span>Search, review, and follow up on people records.</span>
            </Link>
            <Link className="quick-action" href="/evidence/new" prefetch={false}>
              <strong>Upload Evidence</strong>
              <span>Send a file to Drive and save the metadata record.</span>
            </Link>
          </div>
        </article>
      </section>
    </AppFrame>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
