import { AppFrame } from "@/components/app-frame";

export const dynamic = "force-dynamic";

const settings = [
  ["Supabase", "Stores compact structured records and metadata only.", "Pending env setup"],
  ["Google Drive", "Stores evidence files, reports, consent forms, and backup archives.", "Pending Workspace approval"],
  ["Google Sheets", "Readable mirror/export for safe operational views.", "Not configured"],
  ["Vercel", "Hosts the Next.js frontend and app routes.", "Ready after GitHub push"],
];

export default function SettingsPage() {
  return (
    <AppFrame
      eyebrow="Admin setup"
      title="Settings"
      description="Integration readiness, role governance, backup policy, and launch gates before real data entry."
    >
      <section className="workspace-card settings-list">
        {settings.map(([name, detail, status]) => (
          <article key={name}>
            <div>
              <h2>{name}</h2>
              <p>{detail}</p>
            </div>
            <span>{status}</span>
          </article>
        ))}
      </section>
    </AppFrame>
  );
}
