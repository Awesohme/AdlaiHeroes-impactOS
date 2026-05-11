"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  listEnrolmentFieldsAction,
  saveEnrolmentFieldValueAction,
  type EnrolmentFieldRow,
} from "@/app/(protected)/beneficiaries/actions";
import { cn } from "@/lib/utils";

export function EnrolmentFieldsSection({
  enrolmentId,
}: {
  enrolmentId: string | null;
}) {
  const [rows, setRows] = useState<EnrolmentFieldRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!enrolmentId) return;
    setLoading(true);
    listEnrolmentFieldsAction(enrolmentId).then((data) => {
      setRows(data);
      const initial: Record<string, string> = {};
      for (const row of data) initial[row.field_key] = row.value ?? "";
      setDrafts(initial);
      setLoading(false);
    });
  }, [enrolmentId]);

  if (!enrolmentId) return null;
  if (loading) {
    return (
      <p className="text-xs text-muted-foreground py-2">Loading programme data…</p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        This programme has no data fields configured. Add fields in the programme&apos;s
        Advanced setup.
      </p>
    );
  }

  function save(fieldKey: string) {
    const value = drafts[fieldKey] ?? "";
    const existing = rows.find((r) => r.field_key === fieldKey)?.value ?? "";
    if (value === existing) return;
    setFeedback(null);
    setSavingKey(fieldKey);
    startTransition(async () => {
      const result = await saveEnrolmentFieldValueAction(enrolmentId!, fieldKey, value);
      if (result.ok) {
        setRows((current) =>
          current.map((row) =>
            row.field_key === fieldKey
              ? { ...row, value: value.trim() ? value.trim() : null }
              : row,
          ),
        );
        setFeedback(`Saved ${fieldKey}.`);
      } else {
        setFeedback(result.error);
      }
      setSavingKey(null);
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <FieldInput
          key={row.field_key}
          row={row}
          draft={drafts[row.field_key] ?? ""}
          onDraft={(value) => setDrafts((d) => ({ ...d, [row.field_key]: value }))}
          onSave={() => save(row.field_key)}
          saving={pending && savingKey === row.field_key}
          disabled={pending && savingKey !== row.field_key}
        />
      ))}
      {feedback ? (
        <p
          className={cn(
            "text-xs",
            feedback.startsWith("Saved") ? "text-emerald-700" : "text-destructive",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function FieldInput({
  row,
  draft,
  onDraft,
  onSave,
  saving,
  disabled,
}: {
  row: EnrolmentFieldRow;
  draft: string;
  onDraft: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  const dirty = draft !== (row.value ?? "");
  const type = row.field_type;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">
          {row.label}
          {row.required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
        <Badge variant="outline" className="font-normal text-[10px]">
          {type.replace("_", " ")}
        </Badge>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          {type === "yes_no" ? (
            <Select value={draft || "_unset"} onValueChange={(v) => onDraft(v === "_unset" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_unset">Not recorded</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          ) : type === "select" ? (
            <Input
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder="Captured value"
            />
          ) : type === "number" ? (
            <Input
              type="number"
              inputMode="numeric"
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder="0"
            />
          ) : type === "location" ? (
            <Textarea
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder="Coordinates, area, or descriptive location"
              rows={2}
            />
          ) : type === "image" || type === "signature" ? (
            <p className="text-xs text-muted-foreground italic">
              {type === "image" ? "Image capture coming soon — use the beneficiary's profile image for now." : "Signature capture coming soon."}
            </p>
          ) : (
            <Input
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder="Captured value"
            />
          )}
        </div>
        {type !== "image" && type !== "signature" ? (
          <Button
            type="button"
            size="sm"
            variant={dirty ? "default" : "ghost"}
            onClick={onSave}
            disabled={!dirty || saving || disabled}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : dirty ? "Save" : "✓"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
