"use client";

import { useState, useTransition } from "react";
import type { ProgrammeTypeRow } from "@/lib/programme-types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createProgrammeTypeAction,
  updateProgrammeTypeAction,
} from "@/app/(protected)/settings/actions";
import { Loader2, Plus } from "lucide-react";

export function ProgrammeTypesTab({ initial }: { initial: ProgrammeTypeRow[] }) {
  const [types, setTypes] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dbBacked = types.some((type) => type.id);

  function createType() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      const result = await createProgrammeTypeAction(formData);
      if (result.ok) {
        setTypes((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            name,
            description,
            color: null,
            position: current.length,
            is_active: true,
          },
        ]);
        setName("");
        setDescription("");
        setFeedback("Programme type added.");
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {!dbBacked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The <code>programme_types</code> table is not live yet, so ImpactOps is using built-in defaults.
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">Add programme type</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Education Support" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional note for when staff should use this type"
                rows={2}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {feedback ? (
              <p className={feedback === "Programme type added." ? "text-xs text-emerald-700" : "text-xs text-destructive"}>
                {feedback}
              </p>
            ) : null}
            <Button onClick={createType} disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add type
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {types.map((type) => (
            <ProgrammeTypeRow
              key={type.name}
              type={type}
              onChange={(updated) =>
                setTypes((current) => current.map((row) => (row.name === type.name ? updated : row)))
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgrammeTypeRow({
  type,
  onChange,
}: {
  type: ProgrammeTypeRow;
  onChange: (type: ProgrammeTypeRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [description, setDescription] = useState(type.description);
  const [active, setActive] = useState(type.is_active);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!type.id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateProgrammeTypeAction(type.id!, {
        name,
        description,
        is_active: active,
      });
      if (result.ok) {
        onChange({ ...type, name, description, is_active: active });
        setEditing(false);
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Active
              </label>
              <Textarea
                className="sm:col-span-2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-words text-sm font-medium">{type.name}</p>
                <Badge variant={type.is_active ? "default" : "secondary"} className="font-normal">
                  {type.is_active ? "Active" : "Hidden"}
                </Badge>
              </div>
              {type.description ? (
                <p className="break-words text-xs text-muted-foreground">{type.description}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          {editing ? (
            <>
              <Button size="sm" onClick={save} disabled={pending || !name.trim() || !type.id}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={!type.id}>
              Edit
            </Button>
          )}
        </div>
      </div>
      {feedback ? <p className="text-xs text-destructive">{feedback}</p> : null}
    </div>
  );
}
