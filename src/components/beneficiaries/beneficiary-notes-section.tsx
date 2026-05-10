"use client";

import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus } from "lucide-react";
import {
  addBeneficiaryNoteAction,
  listBeneficiaryNotesAction,
  type BeneficiaryNote,
} from "@/app/(protected)/beneficiaries/actions";
import { cn } from "@/lib/utils";

export function BeneficiaryNotesSection({
  beneficiaryId,
  enrolmentId,
  programmeId,
}: {
  beneficiaryId: string;
  enrolmentId: string | null;
  programmeId: string | null;
}) {
  const [notes, setNotes] = useState<BeneficiaryNote[]>([]);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    listBeneficiaryNotesAction(beneficiaryId).then((rows) => {
      setNotes(rows);
      setLoading(false);
    });
  }, [beneficiaryId]);

  function addNote() {
    if (!body.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await addBeneficiaryNoteAction(beneficiaryId, body, enrolmentId, programmeId);
      if (result.ok) {
        setNotes(result.data ?? []);
        setBody("");
        setFeedback("Note added.");
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="beneficiary-note">Notes</Label>
        <span className="text-xs text-muted-foreground">{notes.length} entries</span>
      </div>
      <Textarea
        id="beneficiary-note"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Record a stage move reason, follow-up, or case observation…"
        rows={3}
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={addNote} disabled={!body.trim() || pending}>
          <MessageSquarePlus className="h-4 w-4" />
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
      {feedback ? (
        <p
          className={cn(
            "text-xs",
            feedback === "Note added." ? "text-emerald-700" : "text-destructive",
          )}
        >
          {feedback}
        </p>
      ) : null}
      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-2">
                <span className="truncate">{note.authorEmail}</span>
                <time>{formatDate(note.createdAt)}</time>
              </div>
              {note.programmeName ? (
                <Badge variant="outline" className="font-normal text-xs">
                  {note.programmeName}
                </Badge>
              ) : null}
              <p className="text-sm whitespace-pre-wrap">{note.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
