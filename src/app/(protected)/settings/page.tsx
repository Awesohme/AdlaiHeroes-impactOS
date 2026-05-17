import { AppFrame } from "@/components/app-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGoogleDriveEnvStatus, hasGoogleDriveServerEnv } from "@/lib/google-drive/server";
import { getFieldTemplates } from "@/lib/field-templates";
import { FieldTemplatesTab } from "@/components/settings/field-templates-tab";
import { getProgrammeTypes } from "@/lib/programme-types";
import { ProgrammeTypesTab } from "@/components/settings/programme-types-tab";
import { UsersTab, type UserRow } from "@/components/settings/users-tab";
import { AiSettingsTab } from "@/components/settings/ai-settings-tab";
import { PlatformFeedbackPanel } from "@/components/settings/platform-feedback-panel";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoredReportAiSettings } from "@/lib/report-ai-settings";

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

export default async function SettingsPage() {
  const drive = getGoogleDriveEnvStatus();
  const [fieldTemplates, programmeTypes, currentProfile] = await Promise.all([
    getFieldTemplates(),
    getProgrammeTypes({ includeInactive: true }),
    getCurrentProfile(),
  ]);
  const isAdmin = currentProfile?.role === "admin" && currentProfile.is_active;
  const aiSettings = isAdmin ? await getStoredReportAiSettings() : null;
  let users: UserRow[] = [];
  let usersFetchError: string | null = null;
  if (isAdmin) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("profiles")
        .select("id, full_name, email, username, role, is_active")
        .order("created_at", { ascending: true });
      if (error) {
        usersFetchError = error.message;
      } else {
        users = (data ?? []) as UserRow[];
      }
    } catch (err) {
      usersFetchError = err instanceof Error ? err.message : "Admin client init failed.";
    }
  }
  const driveReady = hasGoogleDriveServerEnv();
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

  return (
    <AppFrame
      eyebrow="Admin"
      title="Settings"
      description="Integration readiness and launch gates."
    >
      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto" data-tour="settings-tabs">
          <TabsTrigger value="fields">Field templates</TabsTrigger>
          <TabsTrigger value="programme-types">Programme types</TabsTrigger>
          {isAdmin ? <TabsTrigger value="users">Users</TabsTrigger> : null}
          {isAdmin ? <TabsTrigger value="ai">AI</TabsTrigger> : null}
          <TabsTrigger value="platform">Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <FieldTemplatesTab initial={fieldTemplates} />
        </TabsContent>

        <TabsContent value="programme-types">
          <ProgrammeTypesTab initial={programmeTypes} />
        </TabsContent>

        {isAdmin && currentProfile ? (
          <TabsContent value="users" data-tour="settings-users">
            <UsersTab
              initial={users}
              currentUserId={currentProfile.id}
              configError={usersFetchError}
            />
          </TabsContent>
        ) : null}

        {isAdmin ? (
          <TabsContent value="ai">
            <AiSettingsTab initial={aiSettings} />
          </TabsContent>
        ) : null}

        <TabsContent value="platform" className="space-y-4" data-tour="settings-platform">
          <PlatformFeedbackPanel />
          <Card>
            <CardContent className="p-0 divide-y">
              {[...platformItems, ...driveItems].map((item) => (
                <SettingRow key={item.name} {...item} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
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
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="break-words text-sm font-medium">{name}</p>
        <p className="break-all text-sm text-muted-foreground sm:break-words">{detail}</p>
      </div>
      <Badge variant={ok ? "default" : "secondary"} className="w-fit shrink-0 font-normal">
        {status}
      </Badge>
    </div>
  );
}
