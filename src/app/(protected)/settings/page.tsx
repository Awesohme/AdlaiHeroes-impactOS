import { AppFrame } from "@/components/app-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGoogleDriveEnvStatus, hasGoogleDriveServerEnv } from "@/lib/google-drive/server";
import { testGoogleDriveConnectionAction } from "./actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const platformItems = [
  {
    name: "Supabase",
    detail: "Stores compact structured records and metadata only.",
    status: "Live",
    ok: true,
  },
  {
    name: "Google Sheets",
    detail: "Readable mirror/export for safe operational views.",
    status: "Planned",
    ok: false,
  },
  {
    name: "Vercel",
    detail: "Hosts the Next.js frontend and app routes.",
    status: "Production",
    ok: true,
  },
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
  const driveOk = params.drive_test === "ok";
  const driveError = params.drive_test === "error";
  const driveStatus = driveOk
    ? "Drive root verified."
    : driveError
      ? params.drive_error || "Drive test failed. Check the configuration."
      : undefined;

  const driveItems = [
    {
      name: "Drive automation",
      detail: "Evidence uploads route through a backend Google connection.",
      status: driveReady ? "Configured" : "Missing",
      ok: driveReady,
    },
    {
      name: "Drive auth mode",
      detail:
        drive.mode === "oauth-refresh-token"
          ? "OAuth refresh token"
          : drive.mode === "service-account"
            ? "Service account"
            : "Not configured",
      status: drive.mode ? "Detected" : "Missing",
      ok: !!drive.mode,
    },
    {
      name: "Drive root folder",
      detail: drive.rootFolderId || "Set GOOGLE_DRIVE_ROOT_FOLDER_ID.",
      status: drive.rootFolderId ? "Configured" : "Missing",
      ok: !!drive.rootFolderId,
    },
    {
      name: "OAuth client",
      detail: drive.oauthClientId || "Set GOOGLE_DRIVE_CLIENT_ID.",
      status:
        drive.oauthClientId && drive.hasOauthClientSecret ? "Configured" : "Missing",
      ok: !!(drive.oauthClientId && drive.hasOauthClientSecret),
    },
    {
      name: "OAuth refresh token",
      detail: "GOOGLE_DRIVE_REFRESH_TOKEN must stay server-side.",
      status: drive.hasOauthRefreshToken ? "Configured" : "Missing",
      ok: drive.hasOauthRefreshToken,
    },
    {
      name: "Service account fallback",
      detail: drive.serviceAccountEmail || "Optional for Shared Drive mode.",
      status:
        drive.serviceAccountEmail && drive.hasServiceAccountPrivateKey
          ? "Ready"
          : "Optional",
      ok: !!(drive.serviceAccountEmail && drive.hasServiceAccountPrivateKey),
    },
  ];

  const diagnostics =
    params.drive_mode ||
    params.drive_token_email ||
    params.drive_user_email ||
    params.drive_scope ||
    params.drive_root_status
      ? [
          { label: "Detected mode", value: params.drive_mode || "—" },
          { label: "Token email", value: params.drive_token_email || "—" },
          { label: "Drive user email", value: params.drive_user_email || "—" },
          { label: "Granted scopes", value: params.drive_scope || "—" },
          { label: "Root lookup", value: params.drive_root_status || "—" },
        ]
      : null;

  return (
    <AppFrame
      eyebrow="Admin"
      title="Settings"
      description="Integration readiness and launch gates."
    >
      {driveStatus ? (
        <div
          className={
            driveOk
              ? "flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              : "flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          }
        >
          {driveOk ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{driveStatus}</span>
        </div>
      ) : null}

      <Tabs defaultValue="drive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drive">Google Drive</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          {diagnostics ? <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="drive" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">Verify Drive access</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirms the configured root is reachable and can create the healthcheck folder.
                </p>
              </div>
              <form action={testGoogleDriveConnectionAction}>
                <Button type="submit" size="sm">
                  Test Drive root
                </Button>
              </form>
            </CardHeader>
          </Card>
          <Card>
            <CardContent className="p-0 divide-y">
              {driveItems.map((item) => (
                <SettingRow key={item.name} {...item} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardContent className="p-0 divide-y">
              {platformItems.map((item) => (
                <SettingRow key={item.name} {...item} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {diagnostics ? (
          <TabsContent value="diagnostics">
            <Card>
              <CardContent className="p-0 divide-y">
                {diagnostics.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium font-mono truncate">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </AppFrame>
  );
}

function SettingRow({
  name,
  detail,
  status,
  ok,
}: {
  name: string;
  detail: string;
  status: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={ok ? "default" : "secondary"} className="font-normal shrink-0">
        {status}
      </Badge>
    </div>
  );
}
