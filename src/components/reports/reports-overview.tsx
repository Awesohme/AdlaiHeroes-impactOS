"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  exportApprovedProgrammeReportAction,
  updateProgrammeReportStatusAction,
} from "@/app/(protected)/reports/actions";
import type { ProgrammeReportRow } from "@/lib/reports";
import type { ProgrammeReportStatus, ProgrammeReportType } from "@/lib/reporting-config";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
];

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "interim", label: "Interim" },
  { value: "final", label: "Final" },
];

export function ReportsOverview({
  initialReports,
  programmeOptions,
  canManageOps,
}: {
  initialReports: ProgrammeReportRow[];
  programmeOptions: Array<{ value: string; label: string }>;
  canManageOps: boolean;
}) {
  const [reports, setReports] = useState(initialReports);
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProgrammeReportStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ProgrammeReportType | "all">("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [exportPending, startExportTransition] = useTransition();

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        if (programmeFilter !== "all" && report.programme_id !== programmeFilter) return false;
        if (statusFilter !== "all" && report.status !== statusFilter) return false;
        if (typeFilter !== "all" && report.report_type !== typeFilter) return false;
        return true;
      }),
    [programmeFilter, reports, statusFilter, typeFilter],
  );

  function updateStatus(reportId: string, status: string) {
    if (!canManageOps) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateProgrammeReportStatusAction(reportId, status);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setReports((current) =>
        current.map((row) => (row.id === reportId ? { ...row, status: status as ProgrammeReportStatus } : row)),
      );
    });
  }

  function exportReport(reportId: string) {
    if (!canManageOps) return;
    setFeedback(null);
    startExportTransition(async () => {
      const result = await exportApprovedProgrammeReportAction(reportId);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setReports((current) =>
        current.map((row) =>
          row.id === reportId && result.data.report ? result.data.report : row,
        ),
      );
      setFeedback("Branded DOCX exported to the programme Reports folder.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SearchableSelect
          value={programmeFilter}
          onChange={setProgrammeFilter}
          options={[{ value: "all", label: "All programmes" }, ...programmeOptions]}
          placeholder="Filter by programme"
          searchPlaceholder="Search programmes..."
        />
        <SearchableSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as ProgrammeReportStatus | "all")}
          options={statusOptions}
          placeholder="Filter by status"
          searchPlaceholder="Search report statuses..."
        />
        <SearchableSelect
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as ProgrammeReportType | "all")}
          options={typeOptions}
          placeholder="Filter by type"
          searchPlaceholder="Search report types..."
        />
      </div>

      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No generated reports match the current filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{report.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{formatLabel(report.report_type)}</Badge>
                    <Badge>{formatLabel(report.status)}</Badge>
                    {report.report_period_label ? <span>{report.report_period_label}</span> : null}
                    {report.audience_label ? <span>{report.audience_label}</span> : null}
                    {report.programme_name ? <span>{report.programme_name}</span> : null}
                    {report.programme_code ? <span className="font-mono">{report.programme_code}</span> : null}
                    <span>{report.document_format === "docx" ? "DOCX fallback" : "Google Doc"}</span>
                    <span>{formatDate(report.updated_at)}</span>
                  </div>
                  {report.generation_error ? (
                    <p className="mt-2 text-xs text-amber-700">{report.generation_error}</p>
                  ) : null}
                  {report.generated_by_name || report.generated_by_email ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Generated by {report.generated_by_name || report.generated_by_email}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canManageOps ? (
                    <SearchableSelect
                      value={report.status}
                      onChange={(value) => updateStatus(report.id, value)}
                      options={statusOptions.filter((option) => option.value !== "all")}
                      placeholder="Set status"
                      searchPlaceholder="Search report statuses..."
                      disabled={pending}
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
                  {canManageOps && report.status === "approved" ? (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => exportReport(report.id)}
                      variant={report.final_export_web_link ? "outline" : "default"}
                      disabled={exportPending}
                    >
                      {exportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {report.final_export_web_link ? "Refresh branded DOCX" : "Export branded DOCX"}
                    </Button>
                  ) : null}
                  {report.final_export_web_link ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={report.final_export_web_link} rel="noopener noreferrer" target="_blank">
                        Open branded DOCX
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
