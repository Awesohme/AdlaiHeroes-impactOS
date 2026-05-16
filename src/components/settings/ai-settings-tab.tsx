"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveReportAiSettingsAction,
  testReportAiConnectionAction,
} from "@/app/(protected)/settings/actions";
import type { StoredReportAiSettings } from "@/lib/report-ai-settings";

export function AiSettingsTab({
  initial,
}: {
  initial: StoredReportAiSettings | null;
}) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? "");
  const [model, setModel] = useState(initial?.model ?? "gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [savePending, startSaveTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();

  function saveSettings() {
    setSaveFeedback(null);
    startSaveTransition(async () => {
      const result = await saveReportAiSettingsAction({
        enabled,
        endpoint,
        model,
        apiKey,
      });
      if (!result.ok) {
        setSaveFeedback(result.error);
        return;
      }
      setApiKey("");
      setSaveFeedback(result.message);
    });
  }

  function testConnection() {
    setTestFeedback(null);
    startTestTransition(async () => {
      const result = await testReportAiConnectionAction();
      setTestFeedback(result.ok ? result.message : result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure optional AI polishing for generated reports. If AI is unavailable, ImpactOps will keep using the structured template draft.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span>
            Enable report AI polishing
            <span className="block text-xs text-muted-foreground">
              This only affects the narrative polish layer after the structured report draft is assembled.
            </span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai-endpoint">Endpoint</Label>
            <Input
              id="ai-endpoint"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-model">Model</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-4.1-mini"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-api-key">API key</Label>
            <Input
              id="ai-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={initial?.keyConfigured ? "Configured — enter a new key to replace it" : "Enter API key"}
            />
            <p className="text-xs text-muted-foreground">
              {initial?.keyConfigured
                ? "A key is already configured. For safety, ImpactOps does not show it again."
                : "The key is encrypted server-side before storage."}
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
          <p>
            Active source: {initial ? "In-app admin settings" : "Server env fallback if present"}
          </p>
          {initial?.updatedAt ? <p className="mt-1">Last updated: {formatDate(initial.updatedAt)}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveSettings} disabled={savePending}>
            {savePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save AI settings
          </Button>
          <Button type="button" variant="outline" onClick={testConnection} disabled={testPending}>
            {testPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test AI connection
          </Button>
        </div>

        {saveFeedback ? <p className="text-sm text-muted-foreground">{saveFeedback}</p> : null}
        {testFeedback ? <p className="text-sm text-muted-foreground">{testFeedback}</p> : null}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
