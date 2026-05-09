import { ArrowUpRight, CalendarCheck, Database, FileText, FolderArchive, HeartHandshake, ShieldCheck, UsersRound } from "@/components/icons";
import { moduleCards, recentEvidence, sponsorshipPipeline, stats } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Adlai ImpactOps Phase 1</p>
          <h1>Evidence-led programme operations, without enterprise software costs.</h1>
          <p className="hero__text">
            Start with structured programme records in Supabase, keep all files and backups in Google Workspace, and deploy the app on Vercel.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#modules">
              View MVP modules
              <ArrowUpRight />
            </a>
            <a className="button button--ghost" href="#architecture">
              Architecture guardrails
            </a>
          </div>
        </div>
        <div className="hero__panel" aria-label="Phase 1 architecture summary">
          <div className="stack-card stack-card--hot">
            <Database />
            <span>Supabase</span>
            <strong>Records only</strong>
          </div>
          <div className="stack-card">
            <FolderArchive />
            <span>Google Drive</span>
            <strong>Files + backups</strong>
          </div>
          <div className="stack-card">
            <FileText />
            <span>Google Sheets</span>
            <strong>Readable mirror</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Operational overview">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="section-grid" id="modules">
        <div className="section-heading">
          <p className="eyebrow">Build order</p>
          <h2>MVP modules we start with</h2>
        </div>
        <div className="module-grid">
          {moduleCards.map((module) => (
            <article className="module-card" key={module.title}>
              <div className="module-card__icon">{module.icon}</div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <span>{module.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel__title">
            <CalendarCheck />
            <div>
              <p className="eyebrow">Education sponsorship</p>
              <h2>Pipeline snapshot</h2>
            </div>
          </div>
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

        <article className="panel">
          <div className="panel__title">
            <ShieldCheck />
            <div>
              <p className="eyebrow">Evidence discipline</p>
              <h2>Recent evidence</h2>
            </div>
          </div>
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

      <section className="architecture" id="architecture">
        <div>
          <p className="eyebrow">Non-negotiables</p>
          <h2>Phase 1 guardrails</h2>
        </div>
        <div className="guardrail-grid">
          <Guardrail icon={<Database />} title="Supabase stays lean" text="Only store structured rows, IDs, statuses, permissions, audit logs, and Drive file metadata." />
          <Guardrail icon={<FolderArchive />} title="Google stores the heavy stuff" text="Photos, videos, receipts, consent forms, generated PDFs, and backup archives live in Drive." />
          <Guardrail icon={<UsersRound />} title="Google sign-in first" text="Use approved organisation accounts and role mappings. No open self-signup for real data." />
          <Guardrail icon={<HeartHandshake />} title="Safeguarding is restricted" text="Sensitive notes must use row-level security and should not be mirrored raw into Sheets." />
        </div>
      </section>
    </main>
  );
}

function Guardrail({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="guardrail">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
