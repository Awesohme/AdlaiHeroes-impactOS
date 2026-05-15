"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  listEnrolmentFieldsAction,
  saveEnrolmentFieldValueAction,
  type EnrolmentFieldRow,
} from "@/app/(protected)/beneficiaries/actions";
import { LocationInput } from "@/components/enrolment-fields/location-input";
import { SignatureInput } from "@/components/enrolment-fields/signature-input";
import { ImageInput } from "@/components/enrolment-fields/image-input";
import { SearchableSelect } from "@/components/searchable-select";
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
    return <p className="text-xs text-muted-foreground py-2">Loading programme data…</p>;
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

  function applyAssetValue(fieldKey: string, driveFileId: string) {
    const newValue = `drive:${driveFileId}`;
    setRows((current) =>
      current.map((row) =>
        row.field_key === fieldKey ? { ...row, value: newValue } : row,
      ),
    );
    setDrafts((current) => ({ ...current, [fieldKey]: newValue }));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <FieldInput
          key={row.field_key}
          enrolmentId={enrolmentId!}
          row={row}
          draft={drafts[row.field_key] ?? ""}
          onDraft={(value) => setDrafts((d) => ({ ...d, [row.field_key]: value }))}
          onSave={() => save(row.field_key)}
          onAssetSaved={(id) => applyAssetValue(row.field_key, id)}
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

function parseMulti(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function serializeMulti(values: string[]): string {
  return values.join(", ");
}

function MultiSelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = parseMulti(value);
  const selectedSet = new Set(selected);

  function toggle(option: string, checked: boolean) {
    if (checked) {
      if (selectedSet.has(option)) return;
      onChange(serializeMulti([...selected, option]));
    } else {
      onChange(serializeMulti(selected.filter((s) => s !== option)));
    }
  }

  return (
    <div className="space-y-1.5 rounded-md border p-2.5">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1"
        >
          <input
            type="checkbox"
            checked={selectedSet.has(option)}
            onChange={(event) => toggle(option, event.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function FieldInput({
  enrolmentId,
  row,
  draft,
  onDraft,
  onSave,
  onAssetSaved,
  saving,
  disabled,
}: {
  enrolmentId: string;
  row: EnrolmentFieldRow;
  draft: string;
  onDraft: (value: string) => void;
  onSave: () => void;
  onAssetSaved: (driveFileId: string) => void;
  saving: boolean;
  disabled: boolean;
}) {
  const dirty = draft !== (row.value ?? "");
  const type = row.field_type;
  const archived = row.archived;
  const isAsset = type === "image" || type === "signature";

  return (
    <div className={cn("space-y-1.5", archived && "opacity-80")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs inline-flex items-center gap-1.5">
          {row.label}
          {row.required ? <span className="text-destructive ml-0.5">*</span> : null}
          {archived ? (
            <Badge variant="secondary" className="font-normal text-[10px]">
              Archived field
            </Badge>
          ) : null}
        </Label>
        <Badge variant="outline" className="font-normal text-[10px]">
          {type.replace("_", " ")}
        </Badge>
      </div>
      <div className="space-y-2">
        {type === "signature" ? (
          <SignatureInput
            enrolmentId={enrolmentId}
            fieldKey={row.field_key}
            value={row.value}
            onSaved={onAssetSaved}
          />
        ) : type === "image" ? (
          <ImageInput
            enrolmentId={enrolmentId}
            fieldKey={row.field_key}
            value={row.value}
            onSaved={onAssetSaved}
          />
        ) : type === "location" ? (
          <LocationInput value={draft} onChange={onDraft} />
        ) : type === "yes_no" ? (
          <SearchableSelect
            value={draft || "_unset"}
            onChange={(value) => onDraft(value === "_unset" ? "" : value)}
            options={[
              { value: "_unset", label: "Not recorded" },
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            placeholder="Not recorded"
          />
        ) : type === "number" ? (
          <Input
            type="number"
            inputMode="numeric"
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            placeholder="0"
          />
        ) : type === "select" ? (
          row.options.length > 0 ? (
            <SearchableSelect
              value={draft || "_unset"}
              onChange={(value) => onDraft(value === "_unset" ? "" : value)}
              options={[
                { value: "_unset", label: "Not recorded" },
                ...row.options.map((option) => ({ value: option, label: option })),
              ]}
              placeholder="Pick a value"
              searchPlaceholder="Search options..."
            />
          ) : (
            <p className="text-xs text-amber-700">
              No options defined for this field. Add options in Settings → Field templates.
            </p>
          )
        ) : type === "multi_select" ? (
          row.options.length > 0 ? (
            <MultiSelectInput options={row.options} value={draft} onChange={onDraft} />
          ) : (
            <p className="text-xs text-amber-700">
              No options defined for this field. Add options in Settings → Field templates.
            </p>
          )
        ) : (
          <Textarea
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            rows={1}
            placeholder="Captured value"
          />
        )}
        {!isAsset ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant={dirty ? "default" : "ghost"}
              onClick={onSave}
              disabled={!dirty || saving || disabled}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : dirty ? (
                "Save"
              ) : (
                "Saved"
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
