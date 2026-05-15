"use client";

import { useEffect, useState, useTransition } from "react";
import type { EvidenceNote, EvidenceRow } from "@/lib/evidence";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquarePlus } from "lucide-react";
import {
  addEvidenceNoteAction,
  loadEvidenceNotesAction,
  updateEvidenceStatusAction,
} from "@/app/(protected)/evidence/actions";
import { cn } from "@/lib/utils";
import { MediaPreview } from "@/components/media-preview";
import { InfoTooltip } from "@/components/info-tooltip";
import { SearchableSelect } from "@/components/searchable-select";

const statusOptions = [
  { value: "consent_check", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Confirmed" },
];

export function EvidenceDetailSheet({
  evidence,
  open,
  onOpenChange,
}: {
  evidence: EvidenceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState(evidence?.rawStatus ?? "in_review");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [notes, setNotes] = useState<EvidenceNote[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isNotePending, startNoteTransition] = useTransition();

  useEffect(() => {
    if (!open || !evidence?.id) return;
    setStatus(evidence.rawStatus);
    setStatusFeedback(null);
    setNoteFeedback(null);
    setNoteBody("");
    setLoadingNotes(true);
    loadEvidenceNotesAction(evidence.id).then((rows) => {
      setNotes(rows);
      setLoadingNotes(false);
    });
  }, [open, evidence?.id, evidence?.rawStatus]);

  if (!evidence) return null;

  const isMock = !evidence.id;
  const dirtyStatus = status !== evidence.rawStatus;

  function saveStatus() {
    if (!evidence?.id || !dirtyStatus) return;
    setStatusFeedback(null);
    startStatusTransition(async () => {
      const result = await updateEvidenceStatusAction(evidence.id!, status);
      if (result.ok) {
        setStatusFeedback("Status updated.");
      } else {
        setStatusFeedback(result.error ?? "Could not update status.");
      }
    });
  }

  function addNote() {
    if (!evidence?.id || !noteBody.trim()) return;
    setNoteFeedback(null);
    startNoteTransition(async () => {
      const result = await addEvidenceNoteAction(evidence.id!, noteBody);
      if (result.ok) {
        setNotes(result.notes ?? []);
        setNoteBody("");
        setNoteFeedback("Note added.");
      } else {
        setNoteFeedback(result.error ?? "Could not save note.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{evidence.title}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{evidence.code}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {evidence.driveFileId ? (
            <MediaPreview
              driveFileId={evidence.driveFileId}
              label={evidence.title}
            />
          ) : null}

          <DetailGrid evidence={evidence} />

          <section className="space-y-2 border-t pt-5">
            <Label htmlFor="evidence-status" className="inline-flex items-center gap-1">
              Verification status
              <InfoTooltip content="Pending means not ready, In review means staff are checking it, Confirmed means it can be used." />
            </Label>
            <div className="flex gap-2">
              <SearchableSelect
                value={status}
                onChange={setStatus}
                disabled={isMock}
                className="flex-1"
                options={statusOptions}
                placeholder="Verification status"
                searchPlaceholder="Search statuses..."
              />
              <Button
                type="button"
                onClick={saveStatus}
                disabled={!dirtyStatus || isStatusPending || isMock}
              >
                {isStatusPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            {statusFeedback ? (
              <p
                className={cn(
                  "text-xs",
                  statusFeedback === "Status updated." ? "text-emerald-700" : "text-destructive",
                )}
              >
                {statusFeedback}
              </p>
            ) : null}
            {isMock ? (
              <p className="text-xs text-muted-foreground">
                This is fallback data — status updates are disabled.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="evidence-note">Notes</Label>
              <span className="text-xs text-muted-foreground">{notes.length} entries</span>
            </div>
            <Textarea
              id="evidence-note"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Add a review note, follow-up action, or reasoning…"
              rows={3}
              disabled={isMock}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={addNote}
                disabled={!noteBody.trim() || isNotePending || isMock}
              >
                <MessageSquarePlus className="h-4 w-4" />
                {isNotePending ? "Saving…" : "Add note"}
              </Button>
            </div>
            {noteFeedback ? (
              <p
                className={cn(
                  "text-xs",
                  noteFeedback === "Note added." ? "text-emerald-700" : "text-destructive",
                )}
              >
                {noteFeedback}
              </p>
            ) : null}

            <div className="space-y-2">
              {loadingNotes ? (
                <p className="text-xs text-muted-foreground py-2">Loading notes…</p>
              ) : notes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <article key={note.id} className="rounded-md border bg-muted/30 p-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{note.authorEmail}</span>
                      <time>{formatDate(note.createdAt)}</time>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailGrid({ evidence }: { evidence: EvidenceRow }) {
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Programme" value={evidence.linkedRecord} />
      <Row label="Type" value={evidence.fileType} />
      <Row label="Uploaded by" value={evidence.uploadedBy} />
      <Row
        label="Uploaded"
        value={evidence.uploadedAt ? formatDate(evidence.uploadedAt) : "—"}
      />
      <Row
        label="Current status"
        value={
          <Badge className={cn("font-normal", statusBadgeClass(evidence.rawStatus))}>
            {evidence.status}
          </Badge>
        }
      />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-1.5 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

export function statusBadgeClass(rawStatus: string) {
  if (rawStatus === "verified")
    return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
  if (rawStatus === "consent_check")
    return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100";
  return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100";
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
