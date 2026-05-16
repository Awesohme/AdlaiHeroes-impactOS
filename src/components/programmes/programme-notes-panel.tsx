"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import { addProgrammeNoteAction, listProgrammeNotesAction } from "@/app/(protected)/reports/actions";
import { REPORT_NOTE_CATEGORIES } from "@/lib/reporting-config";
import type { ProgrammeNoteRow } from "@/lib/reports";

export function ProgrammeNotesPanel({
  programmeId,
  canManageOps,
}: {
  programmeId: string;
  canManageOps: boolean;
}) {
  const [notes, setNotes] = useState<ProgrammeNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteCategory, setNoteCategory] = useState<string>("update");
  const [noteBody, setNoteBody] = useState("");
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProgrammeNotesAction(programmeId).then((rows) => {
      if (cancelled) return;
      setNotes(rows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [programmeId]);

  function addNote() {
    if (!canManageOps) return;
    setNoteFeedback(null);
    startTransition(async () => {
      const result = await addProgrammeNoteAction(programmeId, {
        category: noteCategory,
        body: noteBody,
        includeInReport: true,
      });
      if (!result.ok) {
        setNoteFeedback(result.error);
        return;
      }
      setNotes(result.data);
      setNoteBody("");
      setNoteFeedback("Programme note saved.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Programme notes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture operational updates, risks, outcomes, partner context, and next steps. You will choose which notes to include each time you generate a report.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <Label>Category</Label>
            <SearchableSelect
              value={noteCategory}
              onChange={setNoteCategory}
              options={REPORT_NOTE_CATEGORIES.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              placeholder="Choose note category"
              searchPlaceholder="Search note categories..."
              disabled={!canManageOps}
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Capture a delivery update, risk, outcome, partner observation, or next step..."
              rows={3}
              value={noteBody}
              disabled={!canManageOps}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!canManageOps || pending} onClick={addNote} type="button">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save note
          </Button>
          {noteFeedback ? <p className="text-sm text-muted-foreground">{noteFeedback}</p> : null}
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading programme notes…</p>
          ) : notes.length ? (
            notes.map((note) => (
              <div key={note.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatLabel(note.category)}</Badge>
                  {note.include_in_report ? <Badge variant="secondary">Default include</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.created_at)}
                    {note.created_by_name || note.created_by_email
                      ? ` · ${note.created_by_name || note.created_by_email}`
                      : ""}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No programme notes yet.</p>
          )}
        </div>
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

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
