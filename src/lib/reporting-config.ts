import { lagosToday } from "@/lib/dates";

export const REPORT_NOTE_CATEGORIES = [
  { value: "update", label: "Update" },
  { value: "risk", label: "Risk" },
  { value: "outcome", label: "Outcome" },
  { value: "partner", label: "Partner" },
  { value: "finance", label: "Finance" },
  { value: "evidence", label: "Evidence" },
  { value: "next_step", label: "Next step" },
] as const;

export type ReportNoteCategory = (typeof REPORT_NOTE_CATEGORIES)[number]["value"];
export type ProgrammeReportType = "interim" | "final";
export type ProgrammeReportStatus = "draft" | "in_review" | "approved" | "archived";

export function canGenerateFinalReport(programme: {
  end_date: string | null;
  status: string;
}) {
  if (programme.status === "completed") {
    return true;
  }

  if (!programme.end_date) {
    return false;
  }

  return programme.end_date <= toIsoDate(lagosToday());
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
