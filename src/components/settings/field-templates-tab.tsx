"use client";

import { useState, useTransition } from "react";
import type { FieldTemplate } from "@/lib/field-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createFieldTemplateAction,
  deleteFieldTemplateAction,
  updateFieldTemplateAction,
} from "@/app/(protected)/settings/actions";
import { Loader2, Plus, Trash2 } from "lucide-react";

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "yes_no", label: "Yes / No" },
  { value: "location", label: "Location" },
  { value: "image", label: "Image" },
  { value: "signature", label: "Signature" },
];

export function FieldTemplatesTab({ initial }: { initial: FieldTemplate[] }) {
  const [templates, setTemplates] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<"text" | "number" | "select" | "yes_no" | "location">("text");
  const [newDescription, setNewDescription] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dbBacked = templates.some((t) => t.id);

  function handleCreate() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("label", newLabel);
      formData.set("field_key", newKey);
      formData.set("field_type", newType);
      formData.set("description", newDescription);
      if (newRequired) formData.set("default_required", "on");
      const result = await createFieldTemplateAction(formData);
      if (result.ok) {
        setNewLabel("");
        setNewKey("");
        setNewDescription("");
        setNewRequired(false);
        // optimistic: append at the end with an id placeholder; full data comes on refresh
        setTemplates((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            field_key: newKey || newLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            label: newLabel,
            field_type: newType,
            description: newDescription,
            default_required: newRequired,
            position: current.length,
          },
        ]);
        setFeedback("Field added.");
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {!dbBacked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The <code>field_templates</code> table isn&apos;t live yet, so this is showing the
          built-in defaults. Run the latest SQL block in Supabase to start editing them.
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">Add a new field</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                placeholder="School Grade / Class"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Key (optional)</Label>
              <Input
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                placeholder="school_grade_class"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(value) => setNewType(value as typeof newType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(event) => setNewRequired(event.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Default required
            </label>
            <Textarea
              className="sm:col-span-2"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Short description of when to capture this field"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-3 justify-end">
            {feedback ? (
              <p
                className={feedback === "Field added." ? "text-xs text-emerald-700" : "text-xs text-destructive"}
              >
                {feedback}
              </p>
            ) : null}
            <Button onClick={handleCreate} disabled={pending || !newLabel.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add field
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 divide-y">
          {templates.map((template) => (
            <FieldTemplateRow
              key={template.field_key}
              template={template}
              onChange={(updated) =>
                setTemplates((current) =>
                  current.map((row) => (row.field_key === template.field_key ? updated : row)),
                )
              }
              onDelete={() =>
                setTemplates((current) => current.filter((row) => row.field_key !== template.field_key))
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldTemplateRow({
  template,
  onChange,
  onDelete,
}: {
  template: FieldTemplate;
  onChange: (template: FieldTemplate) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(template.label);
  const [fieldType, setFieldType] = useState(template.field_type);
  const [description, setDescription] = useState(template.description);
  const [required, setRequired] = useState(template.default_required);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!template.id) {
    return (
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium">{template.label}</p>
          <p className="break-words text-xs text-muted-foreground">{template.description || "—"}</p>
          <div className="mt-1 flex gap-2">
            <Badge variant="outline" className="font-normal text-xs">
              {template.field_type}
            </Badge>
            <Badge variant="outline" className="font-normal text-xs font-mono">
              {template.field_key}
            </Badge>
          </div>
        </div>
        <span className="text-xs text-muted-foreground italic">Built-in</span>
      </div>
    );
  }

  function save() {
    if (!template.id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateFieldTemplateAction(template.id!, {
        label,
        field_type: fieldType,
        description,
        default_required: required,
      });
      if (result.ok) {
        onChange({ ...template, label, field_type: fieldType, description, default_required: required });
        setEditing(false);
      } else {
        setFeedback(result.error);
      }
    });
  }

  function remove() {
    if (!template.id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteFieldTemplateAction(template.id!);
      if (result.ok) onDelete();
      else setFeedback(result.error);
    });
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={label} onChange={(event) => setLabel(event.target.value)} />
              <Select value={fieldType} onValueChange={(value) => setFieldType(value as typeof fieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                className="sm:col-span-2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Default required
              </label>
            </div>
          ) : (
            <>
          <p className="break-words text-sm font-medium">{template.label}</p>
              {template.description ? (
                <p className="break-words text-xs text-muted-foreground">{template.description}</p>
              ) : null}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="font-normal text-xs">
                  {template.field_type}
                </Badge>
                <Badge variant="outline" className="font-normal text-xs font-mono">
                  {template.field_key}
                </Badge>
                {template.default_required ? (
                  <Badge variant="secondary" className="font-normal text-xs">
                    Required
                  </Badge>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {editing ? (
            <>
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {feedback ? <p className="text-xs text-destructive">{feedback}</p> : null}
    </div>
  );
}
