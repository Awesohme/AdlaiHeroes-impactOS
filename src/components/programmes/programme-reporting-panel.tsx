"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/searchable-select";
import {
  generateProgrammeReportAction,
  listProgrammeNotesAction,
  listProgrammeReportsAction,
  updateProgrammeReportStatusAction,
} from "@/app/(protected)/reports/actions";
import type { ProgrammeNoteRow, ProgrammeReportRow } from "@/lib/reports";
import {
  canGenerateFinalReport,
  type ProgrammeReportStatus,
} from "@/lib/reporting-config";

const reportStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

type GenerationState = {
  reportType: "interim" | "final";
  includeBeneficiaryList: boolean;
  selectedNoteIds: string[];
};

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
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [generationModal, setGenerationModal] = useState<GenerationState | null>(null);
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

  function openGenerator(reportType: "interim" | "final") {
    setReportFeedback(null);
    setGenerationModal({
      reportType,
      includeBeneficiaryList: false,
      selectedNoteIds: notes.filter((note) => note.include_in_report).map((note) => note.id),
    });
  }

  function toggleNote(noteId: string) {
    setGenerationModal((current) => {
      if (!current) return current;
      const selected = current.selectedNoteIds.includes(noteId)
        ? current.selectedNoteIds.filter((id) => id !== noteId)
        : [...current.selectedNoteIds, noteId];
      return { ...current, selectedNoteIds: selected };
    });
  }

  function generateReport() {
    if (!canManageOps || !generationModal) return;
    setReportFeedback(null);
    startReportTransition(async () => {
      const result = await generateProgrammeReportAction(programmeId, {
        reportType: generationModal.reportType,
        includeBeneficiaryList: generationModal.includeBeneficiaryList,
        selectedNoteIds: generationModal.selectedNoteIds,
      });
      if (!result.ok) {
        setReportFeedback(result.error);
        return;
      }
      const [freshNotes, freshReports] = await Promise.all([
        listProgrammeNotesAction(programmeId),
        listProgrammeReportsAction({ programmeId }),
      ]);
      setNotes(freshNotes);
      setReports(freshReports);
      setGenerationModal(null);
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

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageOps || reportPending}
              onClick={() => openGenerator("interim")}
              type="button"
            >
              {reportPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate interim report
            </Button>
            <Button
              disabled={!canManageOps || reportPending || !canGenerateFinal}
              onClick={() => openGenerator("final")}
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

          {reportFeedback ? <p className="text-sm text-muted-foreground">{reportFeedback}</p> : null}
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatLabel(report.report_type)}</Badge>
                      <Badge variant={report.generated_with_ai ? "default" : "secondary"}>
                        {report.generated_with_ai ? "AI-polished" : "Template draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDate(report.updated_at)}
                        {report.generated_by_name || report.generated_by_email
                          ? ` · ${report.generated_by_name || report.generated_by_email}`
                          : ""}
                      </span>
                    </div>
                    {report.generation_error ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Export fallback used: {report.generation_error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <SearchableSelect
                      value={report.status}
                      onChange={(value) =>
                        updateStatus(report.id, value as ProgrammeReportStatus)
                      }
                      options={reportStatusOptions.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      placeholder="Choose status"
                      searchPlaceholder="Search report statuses..."
                      disabled={!canManageOps || statusPending}
                    />
                    {report.drive_web_link ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={report.drive_web_link} target="_blank" rel="noreferrer">
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
              No reports generated yet.
            </p>
          )}
        </CardContent>
      </Card>

      {generationModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                Generate {generationModal.reportType === "final" ? "final" : "interim"} report
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose which programme notes to include in this report draft.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  checked={generationModal.includeBeneficiaryList}
                  className="mt-1"
                  onChange={(event) =>
                    setGenerationModal((current) =>
                      current
                        ? { ...current, includeBeneficiaryList: event.target.checked }
                        : current,
                    )
                  }
                  type="checkbox"
                />
                <span>
                  Include beneficiary names in the generated draft
                  <span className="block text-xs text-muted-foreground">
                    Leave this off by default for donor privacy and safer sharing.
                  </span>
                </span>
              </label>

              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Programme notes</p>
                    <p className="text-xs text-muted-foreground">
                      {generationModal.selectedNoteIds.length} selected
                    </p>
                  </div>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto p-4">
                  {notes.length ? (
                    notes.map((note) => {
                      const checked = generationModal.selectedNoteIds.includes(note.id);
                      return (
                        <label
                          key={note.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNote(note.id)}
                            className="mt-1 h-4 w-4 rounded border-input"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{formatLabel(note.category)}</Badge>
                              {note.include_in_report ? <Badge variant="secondary">Default include</Badge> : null}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No programme notes yet. You can still generate a report without notes.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setGenerationModal(null)}
                disabled={reportPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={generateReport} disabled={reportPending}>
                {reportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate report
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
