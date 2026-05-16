"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildProgrammeReportContext,
  buildProgrammeReportDocxBuffer,
  listProgrammeNotes,
  listProgrammeReports,
  maybePolishReportDraftWithAi,
  renderProgrammeReportDraft,
  type ProgrammeNoteRow,
  type ProgrammeReportRow,
} from "@/lib/reports";
import {
  canGenerateFinalReport,
  type ProgrammeReportStatus,
  type ProgrammeReportType,
  type ReportNoteCategory,
} from "@/lib/reporting-config";
import {
  createProgrammeReportGoogleDoc,
  uploadProgrammeReportDocxToDrive,
  type ProgrammeFolderRecord,
} from "@/lib/google-drive/server";

export type ReportActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const validReportStatuses = new Set<ProgrammeReportStatus>([
  "draft",
  "in_review",
  "approved",
  "archived",
]);

const validReportTypes = new Set<ProgrammeReportType>(["interim", "final"]);
const validNoteCategories = new Set<ReportNoteCategory>([
  "update",
  "risk",
  "outcome",
  "partner",
  "finance",
  "evidence",
  "next_step",
]);

function mapReportError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Your account can view reports, but report editing is not active yet. Ask an admin to finish your role setup.";
  }
  if (message.includes("does not exist") || message.includes("relation \"public.")) {
    return "Reporting is still being switched on for this workspace. Ask an admin to run the latest platform update, then refresh.";
  }
  return message;
}

export async function listProgrammeNotesAction(programmeId: string) {
  return listProgrammeNotes(programmeId);
}

export async function listProgrammeReportsAction(filters?: {
  programmeId?: string;
  programmeCode?: string;
  reportType?: ProgrammeReportType | "all";
  status?: ProgrammeReportStatus | "all";
}) {
  return listProgrammeReports(filters);
}

export async function addProgrammeNoteAction(
  programmeId: string,
  payload: {
    category: string;
    body: string;
    includeInReport: boolean;
  },
): Promise<ReportActionResult<ProgrammeNoteRow[]>> {
  const category = payload.category.trim() as ReportNoteCategory;
  const body = payload.body.trim();
  if (!validNoteCategories.has(category)) {
    return { ok: false, error: "Choose a valid note category." };
  }
  if (!body) {
    return { ok: false, error: "Note content is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Sign in again." };
  }

  const { error } = await supabase.from("programme_notes").insert({
    programme_id: programmeId,
    category,
    body,
    include_in_report: payload.includeInReport,
    created_by: user.id,
  });

  if (error) {
    return { ok: false, error: mapReportError(error.message, "Could not add note.") };
  }

  revalidatePath("/programmes");
  revalidatePath("/reports");
  return {
    ok: true,
    data: await listProgrammeNotes(programmeId),
  };
}

export async function updateProgrammeReportStatusAction(
  reportId: string,
  status: string,
): Promise<ReportActionResult<ProgrammeReportRow[]>> {
  const nextStatus = status.trim() as ProgrammeReportStatus;
  if (!validReportStatuses.has(nextStatus)) {
    return { ok: false, error: "Choose a valid report status." };
  }

  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("programme_reports")
    .select("programme_id")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError || !report?.programme_id) {
    return { ok: false, error: mapReportError(reportError?.message, "Report not found.") };
  }

  const { error } = await supabase
    .from("programme_reports")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    return { ok: false, error: mapReportError(error.message, "Could not update report status.") };
  }

  revalidatePath("/reports");
  revalidatePath("/programmes");
  return {
    ok: true,
    data: await listProgrammeReports({ programmeId: report.programme_id }),
  };
}

export async function generateProgrammeReportAction(
  programmeId: string,
  payload: {
    reportType: string;
    includeBeneficiaryList?: boolean;
    selectedNoteIds?: string[];
  },
): Promise<
  ReportActionResult<{
    report: ProgrammeReportRow | null;
    generatedVia: "google_doc" | "docx" | "snapshot_only";
  }>
> {
  const reportType = payload.reportType.trim() as ProgrammeReportType;
  if (!validReportTypes.has(reportType)) {
    return { ok: false, error: "Choose a valid report type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Sign in again." };
  }

  const context = await buildProgrammeReportContext(programmeId, {
    reportType,
    includeBeneficiaryList: Boolean(payload.includeBeneficiaryList),
    selectedNoteIds: (payload.selectedNoteIds ?? []).filter(Boolean),
  });

  if (reportType === "final" && !canGenerateFinalReport(context.programme)) {
    return {
      ok: false,
      error: "Final reports are available only after the programme end date passes or the programme is marked completed.",
    };
  }

  const rawDraft = renderProgrammeReportDraft(context);
  const polished = await maybePolishReportDraftWithAi(context, rawDraft);
  const title = buildReportTitle(context.programme.name, reportType);
  const programmeDriveRecord: ProgrammeFolderRecord = {
    id: context.programme.id,
    programme_code: context.programme.programme_code,
    name: context.programme.name,
    drive_folder_id: context.programme.drive_folder_id,
  };

  let driveFileId: string | null = null;
  let driveWebLink: string | null = null;
  let documentFormat: "google_doc" | "docx" = "google_doc";
  let generationError: string | null = null;
  let generatedVia: "google_doc" | "docx" | "snapshot_only" = "google_doc";

  try {
    const googleDoc = await createProgrammeReportGoogleDoc({
      programme: programmeDriveRecord,
      title,
      content: polished.content,
    });
    driveFileId = googleDoc.fileId;
    driveWebLink = googleDoc.webViewLink;
  } catch (googleError) {
    generationError =
      googleError instanceof Error
        ? googleError.message
        : "Google Docs generation failed.";

    try {
      const buffer = await buildProgrammeReportDocxBuffer(title, polished.content);
      const docx = await uploadProgrammeReportDocxToDrive({
        programme: programmeDriveRecord,
        fileName: `${slugifyFileName(title)}.docx`,
        buffer: new Uint8Array(buffer),
      });
      driveFileId = docx.fileId;
      driveWebLink = docx.webViewLink;
      documentFormat = "docx";
      generatedVia = "docx";
      generationError = null;
    } catch (docxError) {
      generationError =
        docxError instanceof Error
          ? docxError.message
          : generationError || "Report file generation failed.";
      generatedVia = "snapshot_only";
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("programme_reports")
    .insert({
      programme_id: programmeId,
      report_type: reportType,
      status: "draft",
      title,
      content_snapshot: polished.content,
      context_snapshot: context,
      drive_file_id: driveFileId,
      drive_web_link: driveWebLink,
      document_format: documentFormat,
      generated_with_ai: polished.usedAi,
      generation_error: generationError,
      generated_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    return {
      ok: false,
      error: mapReportError(insertError.message, "The report draft was generated, but it could not be saved in ImpactOps."),
    };
  }

  revalidatePath("/reports");
  revalidatePath("/programmes");
  revalidatePath(`/programmes/${context.programme.programme_code}/edit`);

  const [report] = await listProgrammeReports({ programmeId }).then((rows) =>
    rows.filter((row) => row.id === inserted?.id),
  );

  return {
    ok: true,
    data: {
      report: report ?? null,
      generatedVia,
    },
  };
}

function buildReportTitle(programmeName: string, reportType: ProgrammeReportType) {
  const today = new Date().toISOString().slice(0, 10);
  const suffix = reportType === "final" ? "Final Report" : "Interim Report";
  return `${programmeName} ${suffix} ${today}`;
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
