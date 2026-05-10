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
  searchParams?: Promise<{
    drive_test?: string;
    drive_error?: string;
    drive_mode?: string;
    drive_token_email?: string;
    drive_user_email?: string;
    drive_scope?: string;
    drive_root_status?: string;
  }>;
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
            <p>Evidence uploads now route through a backend Google connection. For now, the app prefers OAuth refresh-token mode so files can upload into the chosen Adlai Drive account even before Shared Drives are approved.</p>
          </div>
          <span>{driveReady ? "Configured" : "Missing env or folder access"}</span>
        </article>
        <article>
          <div>
            <h2>Drive auth mode</h2>
            <p>
              {drive.mode === "oauth-refresh-token"
                ? "OAuth refresh token"
                : drive.mode === "service-account"
                  ? "Service account"
                  : "Not configured"}
            </p>
          </div>
          <span>{drive.mode ? "Detected" : "Missing"}</span>
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
            <h2>OAuth client</h2>
            <p>{drive.oauthClientId || "Set GOOGLE_DRIVE_CLIENT_ID in Vercel when using OAuth refresh-token mode."}</p>
          </div>
          <span>{drive.oauthClientId && drive.hasOauthClientSecret ? "Configured" : "Missing"}</span>
        </article>
        <article>
          <div>
            <h2>OAuth refresh token</h2>
            <p>Keep GOOGLE_DRIVE_REFRESH_TOKEN server-side only. The backend exchanges it for short-lived access tokens automatically when uploads run.</p>
          </div>
          <span>{drive.hasOauthRefreshToken ? "Configured" : "Missing"}</span>
        </article>
        <article>
          <div>
            <h2>Service account fallback</h2>
            <p>{drive.serviceAccountEmail || "Optional for later Shared Drive mode."}</p>
          </div>
          <span>{drive.serviceAccountEmail && drive.hasServiceAccountPrivateKey ? "Ready later" : "Optional"}</span>
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

      {params.drive_mode || params.drive_token_email || params.drive_user_email || params.drive_scope || params.drive_root_status ? (
        <section className="workspace-card settings-list">
          <article>
            <div>
              <h2>Detected auth mode</h2>
              <p>{params.drive_mode || "Unknown"}</p>
            </div>
            <span>Diagnostic</span>
          </article>
          <article>
            <div>
              <h2>Token email</h2>
              <p>{params.drive_token_email || "Not returned"}</p>
            </div>
            <span>Diagnostic</span>
          </article>
          <article>
            <div>
              <h2>Drive user email</h2>
              <p>{params.drive_user_email || "Not returned"}</p>
            </div>
            <span>Diagnostic</span>
          </article>
          <article>
            <div>
              <h2>Granted scopes</h2>
              <p>{params.drive_scope || "Not returned"}</p>
            </div>
            <span>Diagnostic</span>
          </article>
          <article>
            <div>
              <h2>Root lookup</h2>
              <p>{params.drive_root_status || "Not returned"}</p>
            </div>
            <span>Diagnostic</span>
          </article>
        </section>
      ) : null}

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
