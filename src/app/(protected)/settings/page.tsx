import { AppFrame } from "@/components/app-frame";
import { getGoogleDriveEnvStatus, hasGoogleDriveServerEnv } from "@/lib/google-drive/server";
import { testGoogleDriveConnectionAction } from "./actions";

export const dynamic = "force-dynamic";

const settings = [
  ["Supabase", "Stores compact structured records and metadata only.", "Live for auth, programmes, and evidence metadata"],
  ["Google Sheets", "Readable mirror/export for safe operational views.", "Planned"],
  ["Vercel", "Hosts the Next.js frontend and app routes.", "Production live"],
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ drive_test?: string; drive_error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const drive = getGoogleDriveEnvStatus();
  const driveReady = hasGoogleDriveServerEnv();
  const driveStatus =
    params.drive_test === "ok"
      ? "Drive root verified."
      : params.drive_test === "error"
        ? params.drive_error || "Drive test failed. Check the service account and folder sharing."
        : undefined;

  return (
    <AppFrame
      eyebrow="Admin setup"
      title="Settings"
      description="Integration readiness, role governance, backup policy, and launch gates before real data entry."
    >
      {driveStatus ? (
        <div className={`data-banner ${params.drive_test === "ok" ? "data-banner--live" : ""}`}>
          <strong>{params.drive_test === "ok" ? "Drive ready." : "Drive test failed."}</strong>
          <span>{driveStatus}</span>
        </div>
      ) : null}

      <section className="workspace-card settings-list">
        <article>
          <div>
            <h2>Google Drive automation</h2>
            <p>Evidence uploads now route through a backend service account. Share the chosen root folder or Shared Drive with the service account email below, then use the test action to verify folder access.</p>
          </div>
          <span>{driveReady ? "Configured" : "Missing env or folder access"}</span>
        </article>
        <article>
          <div>
            <h2>Service account email</h2>
            <p>{drive.email || "Set GOOGLE_SERVICE_ACCOUNT_EMAIL in Vercel or local env."}</p>
          </div>
          <span>{drive.email ? "Present" : "Missing"}</span>
        </article>
        <article>
          <div>
            <h2>Drive root folder</h2>
            <p>{drive.rootFolderId || "Set GOOGLE_DRIVE_ROOT_FOLDER_ID to the shared root folder or Shared Drive folder."}</p>
          </div>
          <span>{drive.rootFolderId ? "Configured" : "Missing"}</span>
        </article>
        <article>
          <div>
            <h2>Private key</h2>
            <p>Keep GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY server-side only. Never expose it to the browser bundle.</p>
          </div>
          <span>{drive.hasPrivateKey ? "Configured" : "Missing"}</span>
        </article>
      </section>

      <section className="workspace-card settings-panel">
        <div>
          <p className="eyebrow">Drive readiness</p>
          <h2>Verify folder access</h2>
          <p>Use this after env setup. ImpactOps will confirm the configured root is reachable and can create or reuse an <strong>ImpactOps Healthcheck</strong> folder under it.</p>
        </div>
        <form action={testGoogleDriveConnectionAction}>
          <button className="button button--primary" type="submit">
            Test Google Drive root
          </button>
        </form>
      </section>

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
