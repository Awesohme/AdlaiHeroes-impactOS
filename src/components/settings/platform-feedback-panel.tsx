"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  testGoogleDocsConnectionResultAction,
  testGoogleDriveConnectionResultAction,
  type IntegrationTestActionResult,
} from "@/app/(protected)/settings/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationTestButton } from "@/components/settings/integration-test-button";
export function PlatformFeedbackPanel() {
  const [driveResult, setDriveResult] = useState<IntegrationTestActionResult | null>(null);
  const [docsResult, setDocsResult] = useState<IntegrationTestActionResult | null>(null);

  const latestDiagnostics = (docsResult?.diagnostics ?? driveResult?.diagnostics) || null;

  return (
    <div className="space-y-4">
      {driveResult ? <StatusBanner result={driveResult} /> : null}
      {docsResult ? <StatusBanner result={docsResult} /> : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Verify Drive access</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirms the configured root is reachable and can create the healthcheck folder.
            </p>
          </div>
          <IntegrationTestButton
            action={testGoogleDriveConnectionResultAction}
            defaultLabel="Test Drive root"
            successLabel="Drive verified"
            onResult={setDriveResult}
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Verify Google Docs generation</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirms the workspace can create a native Google Doc, write draft content, and clean up the test document.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              If this fails at token exchange, the usual cause is a refresh token or OAuth client mismatch in Vercel, or a missing redeploy after changing env vars.
            </p>
          </div>
          <IntegrationTestButton
            action={testGoogleDocsConnectionResultAction}
            defaultLabel="Test Google Docs"
            successLabel="Docs verified"
            variant="outline"
            onResult={setDocsResult}
          />
        </CardHeader>
      </Card>

      {latestDiagnostics ? (
        <Card>
          <div className="divide-y">
            {[
              { label: "Detected mode", value: latestDiagnostics.mode || "—" },
              { label: "Token email", value: latestDiagnostics.tokenEmail || "—" },
              { label: "Drive user email", value: latestDiagnostics.driveUserEmail || "—" },
              { label: "Granted scopes", value: latestDiagnostics.driveScope || "—" },
              { label: "Root lookup", value: latestDiagnostics.rootLookupStatus || "—" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="min-w-0 break-all text-sm font-medium font-mono sm:text-right">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function StatusBanner({ result }: { result: IntegrationTestActionResult }) {
  const ok = result.ok;
  const message = result.ok ? result.message : result.error;
  return (
    <div
      className={
        ok
          ? "flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          : "flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
      }
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
