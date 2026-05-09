import { AppFrame } from "@/components/app-frame";
import { MetricCard } from "@/components/metric-card";
import { recentEvidence, sponsorshipPipeline, stats } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppFrame
      eyebrow="Overview"
      title="Operations dashboard"
      description="A donor-ready pulse of programmes, beneficiary reach, evidence completeness, and backup health."
      action={<a className="button button--primary" href="/programmes">Create programme</a>}
    >
      <section className="metric-grid">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>
      <section className="content-grid">
        <article className="workspace-card">
          <h2>Education sponsorship pipeline</h2>
          <div className="pipeline">
            {sponsorshipPipeline.map((stage) => (
              <div className="pipeline__row" key={stage.stage}>
                <span>{stage.stage}</span>
                <strong>{stage.count}</strong>
                <div className="meter">
                  <div style={{ width: `${stage.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="workspace-card">
          <h2>Evidence needing attention</h2>
          <div className="evidence-list">
            {recentEvidence.map((item) => (
              <div className="evidence-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.programme}</span>
                </div>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppFrame>
  );
}
