"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createEvidenceAction, type CreateEvidenceState } from "@/app/(protected)/evidence/new/actions";
import type { ProgrammeRow } from "@/lib/programmes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";

const initialState: CreateEvidenceState = {};

export function EvidenceCreateForm({ programmes }: { programmes: ProgrammeRow[] }) {
  const [state, formAction] = useActionState(createEvidenceAction, initialState);
  const options = programmes.length ? programmes : [];
  const [evidenceType, setEvidenceType] = useState(state.fields?.evidence_type ?? "Document");
  const [programmeCode, setProgrammeCode] = useState(
    state.fields?.programme_code ?? options[0]?.programme_code ?? "",
  );
  const [verificationStatus, setVerificationStatus] = useState(
    state.fields?.verification_status ?? "in_review",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload evidence</CardTitle>
        <p className="text-sm text-muted-foreground">
          Routes the file into the linked programme&apos;s Drive folder and saves metadata.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input
              defaultValue={state.fields?.title ?? ""}
              name="title"
              placeholder="School nomination letters"
            />
          </Field>

          <Field label="Evidence code" hint="Leave blank to auto-generate.">
            <Input
              defaultValue={state.fields?.evidence_code ?? ""}
              name="evidence_code"
              placeholder="EVD-2026-0004"
            />
          </Field>

          <Field label="Evidence type">
            <Select value={evidenceType} onValueChange={setEvidenceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Document">Document</SelectItem>
                <SelectItem value="Photo">Photo</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Attendance">Attendance</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="evidence_type" value={evidenceType} />
          </Field>

          <Field label="Linked programme" hint="Anchors Drive folder routing." className="sm:col-span-2">
            <Select value={programmeCode} onValueChange={setProgrammeCode}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a programme" />
              </SelectTrigger>
              <SelectContent>
                {options.map((programme) => (
                  <SelectItem key={programme.programme_code} value={programme.programme_code}>
                    {programme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="programme_code" value={programmeCode} />
          </Field>

          <Field label="Verification status">
            <Select value={verificationStatus} onValueChange={setVerificationStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="consent_check">Consent check</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="verification_status" value={verificationStatus} />
          </Field>

          <Field
            label="Evidence file"
            hint="Uploaded to the correct Drive programme folder."
            className="sm:col-span-2"
          >
            <Input
              type="file"
              name="evidence_file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.mp4,.mov,.zip"
            />
          </Field>

          {state.error ? (
            <div className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-medium">Upload blocked.</p>
              <p>{state.error}</p>
            </div>
          ) : null}

          <div className="sm:col-span-2 flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Uploading…" : "Upload evidence"}
    </Button>
  );
}
