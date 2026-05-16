"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import {
  addProgrammeNoteAction,
  generateProgrammeReportAction,
  listProgrammeNotesAction,
  listProgrammeReportsAction,
  updateProgrammeReportStatusAction,
} from "@/app/(protected)/reports/actions";
import {
  type ProgrammeNoteRow,
  type ProgrammeReportRow,
} from "@/lib/reports";
import {
  REPORT_NOTE_CATEGORIES,
  canGenerateFinalReport,
  type ProgrammeReportStatus,
} from "@/lib/reporting-config";

const reportStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

export function ProgrammeReportingPanel({
  programmeId,
  programmeName,
  programmeCode,
  programmeStatus,
  programmeEndDate,
  canManageOps,
}: {
  programmeId: string;
  programmeName: string;
  programmeCode: string;
  programmeStatus: string;
  programmeEndDate: string | null;
  canManageOps: boolean;
}) {
  const [notes, setNotes] = useState<ProgrammeNoteRow[]>([]);
  const [reports, setReports] = useState<ProgrammeReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteCategory, setNoteCategory] = useState<string>("update");
  const [noteBody, setNoteBody] = useState("");
  const [includeInReport, setIncludeInReport] = useState(true);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  const [includeBeneficiaryList, setIncludeBeneficiaryList] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [notesPending, startNotesTransition] = useTransition();
  const [reportPending, startReportTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

  const canGenerateFinal = useMemo(
    () => canGenerateFinalReport({ status: programmeStatus, end_date: programmeEndDate }),
    [programmeEndDate, programmeStatus],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listProgrammeNotesAction(programmeId),
      listProgrammeReportsAction({ programmeId }),
    ]).then(([noteRows, reportRows]) => {
      if (cancelled) return;
      setNotes(noteRows);
      setReports(reportRows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [programmeId]);

  function addNote() {
    if (!canManageOps) return;
    setNoteFeedback(null);
    startNotesTransition(async () => {
      const result = await addProgrammeNoteAction(programmeId, {
        category: noteCategory,
        body: noteBody,
        includeInReport,
      });
      if (!result.ok) {
        setNoteFeedback(result.error);
        return;
      }
      setNotes(result.data);
      setNoteBody("");
      setIncludeInReport(true);
      setNoteFeedback("Programme note saved.");
    });
  }

  function generateReport(reportType: "interim" | "final") {
    if (!canManageOps) return;
    setReportFeedback(null);
    startReportTransition(async () => {
      const result = await generateProgrammeReportAction(programmeId, {
        reportType,
        includeBeneficiaryList,
      });
      if (!result.ok) {
        setReportFeedback(result.error);
        return;
      }
      const refreshed = await listProgrammeReportsAction({ programmeId });
      setReports(refreshed);
      setReportFeedback(
        result.data.generatedVia === "snapshot_only"
          ? "The report draft was saved in ImpactOps, but Drive export failed. Retry after fixing Google Docs setup."
          : result.data.generatedVia === "docx"
            ? "Report generated with DOCX fallback and saved to Drive."
            : "Google Doc draft generated successfully.",
      );
    });
  }

  function updateStatus(reportId: string, status: ProgrammeReportStatus) {
    if (!canManageOps) return;
    setReportFeedback(null);
    startStatusTransition(async () => {
      const result = await updateProgrammeReportStatusAction(reportId, status);
      if (!result.ok) {
        setReportFeedback(result.error);
        return;
      }
      setReports(result.data);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Build a structured draft from programme data, then continue editing in Google Docs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{programmeName}</p>
            <p className="mt-1 font-mono text-xs">{programmeCode}</p>
            <p className="mt-2">
              Interim reports are always allowed. Final reports unlock after the programme end date or once the programme is marked completed.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              checked={includeBeneficiaryList}
              className="mt-1"
              onChange={(event) => setIncludeBeneficiaryList(event.target.checked)}
              type="checkbox"
            />
            <span>
              Include beneficiary names in the generated draft
              <span className="block text-xs text-muted-foreground">
                Leave this off by default for donor privacy and safer sharing.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageOps || reportPending}
              onClick={() => generateReport("interim")}
              type="button"
            >
              {reportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate interim report
            </Button>
            <Button
              disabled={!canManageOps || reportPending || !canGenerateFinal}
              onClick={() => generateReport("final")}
              type="button"
              variant="outline"
            >
              Generate final report
            </Button>
          </div>

          {!canGenerateFinal ? (
            <p className="text-xs text-muted-foreground">
              Final report is locked until the programme end date passes or the programme is marked completed.
            </p>
          ) : null}

          {reportFeedback ? (
            <p className="text-sm text-muted-foreground">{reportFeedback}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programme notes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Log donor-relevant context, risks, outcomes, and next steps. Mark notes that should feed generated reports.
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
              />
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Capture a delivery update, risk, outcome, partner observation, or next step..."
                rows={3}
                value={noteBody}
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              checked={includeInReport}
              className="mt-1"
              onChange={(event) => setIncludeInReport(event.target.checked)}
              type="checkbox"
            />
            <span>
              Include this note in generated reports
              <span className="block text-xs text-muted-foreground">
                Turn this off for internal-only observations.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!canManageOps || notesPending}
              onClick={addNote}
              type="button"
            >
              {notesPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save note
            </Button>
            {noteFeedback ? (
              <p className="text-sm text-muted-foreground">{noteFeedback}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading programme notes…</p>
            ) : notes.length ? (
              notes.map((note) => (
                <div key={note.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatLabel(note.category)}</Badge>
                    {note.include_in_report ? <Badge>Included in report</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                      {note.created_by_name || note.created_by_email
                        ? ` · ${note.created_by_name || note.created_by_email}`
                        : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{note.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No programme notes yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generated reports</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track draft status and jump straight into Google Docs for editing.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading generated reports…</p>
          ) : reports.length ? (
            reports.map((report) => (
              <div key={report.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{report.title}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{formatLabel(report.report_type)}</Badge>
                      <Badge>{formatLabel(report.status)}</Badge>
                      <span>{report.document_format === "docx" ? "DOCX fallback" : "Google Doc"}</span>
                      <span>{formatDate(report.updated_at)}</span>
                    </div>
                    {report.generation_error ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Last generation issue: {report.generation_error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canManageOps ? (
                    <SearchableSelect
                      value={report.status}
                      onChange={(value) => updateStatus(report.id, value as ProgrammeReportStatus)}
                      options={reportStatusOptions.map((option) => ({
                        value: option.value,
                          label: option.label,
                        }))}
                      placeholder="Status"
                      searchPlaceholder="Search report statuses..."
                      disabled={statusPending}
                      className="w-[180px]"
                    />
                    ) : null}
                    {report.drive_web_link ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={report.drive_web_link} rel="noopener noreferrer" target="_blank">
                          Open document
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No reports generated for this programme yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
