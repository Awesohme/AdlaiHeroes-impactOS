import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  Footer,
  Document,
  HeadingLevel,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { createClient } from "@/lib/supabase/server";
import { usesEducationScorecard } from "@/lib/programme-pipeline";
import {
  type ProgrammeReportStatus,
  type ProgrammeReportType,
  type ReportNoteCategory,
} from "@/lib/reporting-config";
import { resolveReportAiConfig } from "@/lib/report-ai-settings";

export type ProgrammeNoteRow = {
  id: string;
  programme_id: string;
  category: ReportNoteCategory;
  body: string;
  include_in_report: boolean;
  created_by: string | null;
  created_at: string;
  created_by_name: string | null;
  created_by_email: string | null;
};

export type ProgrammeReportRow = {
  id: string;
  programme_id: string;
  programme_name: string | null;
  programme_code: string | null;
  report_type: ProgrammeReportType;
  status: ProgrammeReportStatus;
  title: string;
  content_snapshot: string;
  context_snapshot: ReportContext | null;
  report_period_label: string | null;
  audience_label: string | null;
  include_evidence_appendix: boolean;
  drive_file_id: string | null;
  drive_web_link: string | null;
  document_format: "google_doc" | "docx";
  final_export_file_id: string | null;
  final_export_web_link: string | null;
  final_export_format: "docx" | "pdf" | null;
  generated_with_ai: boolean;
  generation_error: string | null;
  generated_by: string | null;
  generated_by_name: string | null;
  generated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportContext = {
  generated_at: string;
  report_type: ProgrammeReportType;
  report_period_label: string | null;
  audience_label: string | null;
  include_evidence_appendix: boolean;
  programme: {
    id: string;
    programme_code: string;
    name: string;
    programme_type: string;
    donor_funder: string;
    status: string;
    target_group: string;
    objectives: string;
    programme_description: string;
    locations: string[];
    start_date: string | null;
    end_date: string | null;
    reach_tracking_mode: string;
    reach_unit_label: string;
    target_reach_count: number | null;
    manual_actual_reach_count: number | null;
    actual_reach_count: number | null;
    actual_reach_source: "manual" | "beneficiary_registry";
    budget_ngn: number | null;
    funds_raised: number;
    amount_left: number | null;
    progress_percent: number | null;
    drive_folder_id: string | null;
    pipeline_template_key: string | null;
  };
  milestones: Array<{
    title: string;
    due_date: string | null;
    done: boolean;
  }>;
  notes: Array<{
    category: ReportNoteCategory;
    body: string;
    created_at: string;
    author: string | null;
  }>;
  evidence: {
    total: number;
    verified: number;
    in_review: number;
    pending: number;
    recent: Array<{
      title: string;
      evidence_type: string;
      verification_status: string;
      uploaded_at: string | null;
      drive_file_id: string | null;
    }>;
  };
  beneficiaries: {
    relevant: boolean;
    count: number;
    include_names: boolean;
    names: string[];
    stage_breakdown: Array<{ label: string; count: number }>;
    safeguarding_follow_up: number;
    consent_received: number;
    education_scorecards: {
      enabled: boolean;
      total_scored: number;
      average_score: number | null;
    };
  };
  manual_reach_updates: Array<{
    previous_actual_count: number | null;
    new_actual_count: number;
    note: string | null;
    created_at: string;
    author: string | null;
  }>;
};

type ProgrammeReportRecord = {
  id: string;
  programme_id: string;
  report_type: ProgrammeReportType;
  status: ProgrammeReportStatus;
  title: string;
  content_snapshot: string | null;
  context_snapshot: ReportContext | null;
  report_period_label: string | null;
  audience_label: string | null;
  include_evidence_appendix: boolean | null;
  drive_file_id: string | null;
  drive_web_link: string | null;
  document_format: "google_doc" | "docx" | null;
  final_export_file_id: string | null;
  final_export_web_link: string | null;
  final_export_format: "docx" | "pdf" | null;
  generated_with_ai: boolean | null;
  generation_error: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  programmes?:
    | { name: string | null; programme_code: string | null }
    | Array<{ name: string | null; programme_code: string | null }>
    | null;
  profiles?:
    | { full_name: string | null; email: string | null }
    | Array<{ full_name: string | null; email: string | null }>
    | null;
};

export async function listProgrammeNotes(programmeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_notes")
    .select("id,programme_id,category,body,include_in_report,created_by,created_at,profiles:created_by(full_name,email)")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [] as ProgrammeNoteRow[];
  }

  type ProgrammeNoteRecord = {
    id: string;
    programme_id: string;
    category: ReportNoteCategory;
    body: string;
    include_in_report: boolean;
    created_by: string | null;
    created_at: string;
    profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
  };

  return (data as unknown as ProgrammeNoteRecord[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return ({
      id: row.id,
      programme_id: row.programme_id,
      category: row.category,
      body: row.body,
      include_in_report: row.include_in_report,
      created_by: row.created_by,
      created_at: row.created_at,
      created_by_name: profile?.full_name ?? null,
      created_by_email: profile?.email ?? null,
    });
  });
}

export async function listProgrammeReports(filters?: {
  programmeId?: string;
  programmeCode?: string;
  reportType?: ProgrammeReportType | "all";
  status?: ProgrammeReportStatus | "all";
}) {
  const supabase = await createClient();
  let query = supabase
    .from("programme_reports")
    .select(
      "id,programme_id,report_type,status,title,content_snapshot,context_snapshot,report_period_label,audience_label,include_evidence_appendix,drive_file_id,drive_web_link,document_format,final_export_file_id,final_export_web_link,final_export_format,generated_with_ai,generation_error,generated_by,created_at,updated_at,programmes(name,programme_code),profiles:generated_by(full_name,email)",
    )
    .order("updated_at", { ascending: false });

  if (filters?.programmeId) query = query.eq("programme_id", filters.programmeId);
  if (filters?.reportType && filters.reportType !== "all") query = query.eq("report_type", filters.reportType);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query.limit(80);
  if (error || !data) {
    return [] as ProgrammeReportRow[];
  }

  const rows = (data as unknown as ProgrammeReportRecord[]).map((row) => {
    const programme = Array.isArray(row.programmes) ? row.programmes[0] : row.programmes;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      programme_id: row.programme_id,
      programme_name: programme?.name ?? null,
      programme_code: programme?.programme_code ?? null,
      report_type: row.report_type,
      status: row.status,
      title: row.title,
      content_snapshot: row.content_snapshot ?? "",
      context_snapshot: row.context_snapshot ?? null,
      report_period_label: row.report_period_label ?? null,
      audience_label: row.audience_label ?? null,
      include_evidence_appendix: Boolean(row.include_evidence_appendix),
      drive_file_id: row.drive_file_id,
      drive_web_link: row.drive_web_link,
      document_format: row.document_format ?? "google_doc",
      final_export_file_id: row.final_export_file_id ?? null,
      final_export_web_link: row.final_export_web_link ?? null,
      final_export_format: row.final_export_format ?? null,
      generated_with_ai: Boolean(row.generated_with_ai),
      generation_error: row.generation_error,
      generated_by: row.generated_by,
      generated_by_name: profile?.full_name ?? null,
      generated_by_email: profile?.email ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  if (!filters?.programmeCode) {
    return rows;
  }

  return rows.filter((row) => row.programme_code === filters.programmeCode);
}

export async function buildProgrammeReportContext(
  programmeId: string,
  options?: {
    reportType?: ProgrammeReportType;
    includeBeneficiaryList?: boolean;
    selectedNoteIds?: string[];
    reportPeriodLabel?: string;
    audienceLabel?: string;
    includeEvidenceAppendix?: boolean;
  },
): Promise<ReportContext> {
  const reportType = options?.reportType ?? "interim";
  const includeBeneficiaryList = Boolean(options?.includeBeneficiaryList);
  const reportPeriodLabel = options?.reportPeriodLabel?.trim() || null;
  const audienceLabel = options?.audienceLabel?.trim() || null;
  const includeEvidenceAppendix = Boolean(options?.includeEvidenceAppendix);
  const supabase = await createClient();

  const { data: programmeRaw, error: programmeError } = await supabase
    .from("programmes")
    .select(
      "id,programme_code,name,programme_type,donor_funder,status,target_group,objectives,programme_description,location_areas,start_date,end_date,reach_tracking_mode,reach_unit_label,target_reach_count,manual_actual_reach_count,budget_ngn,drive_folder_id,pipeline_template_key",
    )
    .eq("id", programmeId)
    .maybeSingle();

  if (programmeError || !programmeRaw) {
    throw new Error("Programme not found for report generation.");
  }

  const selectedNoteIds = (options?.selectedNoteIds ?? []).filter(Boolean);

  const [
    fundsResponse,
    milestonesResponse,
    notesResponse,
    evidenceResponse,
    enrolmentsResponse,
    reachUpdatesResponse,
  ] = await Promise.all([
    supabase
      .from("programme_funds")
      .select("amount_ngn,source,contributed_on,note")
      .eq("programme_id", programmeId)
      .order("contributed_on", { ascending: true }),
    supabase
      .from("programme_milestones")
      .select("title,due_date,done,position")
      .eq("programme_id", programmeId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("programme_notes")
      .select("category,body,include_in_report,created_at,profiles:created_by(full_name,email)")
      .eq("programme_id", programmeId)
      .in("id", selectedNoteIds.length ? selectedNoteIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: true }),
    supabase
      .from("evidence")
      .select("title,evidence_type,verification_status,uploaded_at,drive_file_id")
      .eq("programme_id", programmeId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("enrolments")
      .select(
        "id,beneficiary_id,stage_id,programme_stages(key,label),beneficiaries(full_name,gender,state,community,safeguarding_flag,consent_received)",
      )
      .eq("programme_id", programmeId),
    supabase
      .from("programme_reach_updates")
      .select("previous_actual_count,new_actual_count,note,created_at,profiles:created_by(full_name,email)")
      .eq("programme_id", programmeId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const enrolmentRows = (enrolmentsResponse.data ?? []) as Array<{
    id: string;
    beneficiary_id: string | null;
    stage_id: string | null;
    programme_stages?: { key: string | null; label: string | null } | Array<{ key: string | null; label: string | null }> | null;
    beneficiaries?: {
      full_name: string | null;
      gender: string | null;
      state: string | null;
      community: string | null;
      safeguarding_flag: string | null;
      consent_received: boolean | null;
    } | Array<{
      full_name: string | null;
      gender: string | null;
      state: string | null;
      community: string | null;
      safeguarding_flag: string | null;
      consent_received: boolean | null;
    }> | null;
  }>;

  let scorecardRows: Array<{ enrolment_id: string; total_score: number | null }> = [];
  if (usesEducationScorecard(programmeRaw.pipeline_template_key ?? null) && enrolmentRows.length > 0) {
    const { data } = await supabase
      .from("enrolment_scorecards")
      .select("enrolment_id,total_score")
      .in(
        "enrolment_id",
        enrolmentRows.map((row) => row.id),
      );
    scorecardRows = (data ?? []) as Array<{ enrolment_id: string; total_score: number | null }>;
  }

  const milestoneRows = (milestonesResponse.data ?? []) as Array<{
    title: string;
    due_date: string | null;
    done: boolean | null;
  }>;
  const noteRows = (notesResponse.data ?? []) as Array<{
    category: ReportNoteCategory;
    body: string;
    created_at: string;
    profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
  }>;
  const evidenceRows = (evidenceResponse.data ?? []) as Array<{
    title: string | null;
    evidence_type: string | null;
    verification_status: string | null;
    uploaded_at: string | null;
    drive_file_id: string | null;
  }>;
  const fundsRows = (fundsResponse.data ?? []) as Array<{ amount_ngn: number | string | null }>;
  const reachUpdateRows = (reachUpdatesResponse.data ?? []) as Array<{
    previous_actual_count: number | null;
    new_actual_count: number | null;
    note: string | null;
    created_at: string;
    profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
  }>;

  const fundsRaised = fundsRows.reduce((sum, row) => sum + Number(row.amount_ngn ?? 0), 0);
  const beneficiaryIds = new Set(
    enrolmentRows
      .map((row) => row.beneficiary_id)
      .filter((value): value is string => Boolean(value)),
  );
  const actualReachCount =
    programmeRaw.reach_tracking_mode === "manual"
      ? programmeRaw.manual_actual_reach_count ?? null
      : beneficiaryIds.size;
  const targetReachCount = programmeRaw.target_reach_count ?? null;
  const amountLeft =
    programmeRaw.budget_ngn === null
      ? null
      : Math.max(Number(programmeRaw.budget_ngn) - fundsRaised, 0);
  const stageCounts = new Map<string, number>();
  let safeguardingFollowUp = 0;
  let consentReceived = 0;
  const beneficiaryNames: string[] = [];

  for (const enrolment of enrolmentRows) {
    const stage = Array.isArray(enrolment.programme_stages)
      ? enrolment.programme_stages[0]
      : enrolment.programme_stages;
    const stageLabel = stage?.label?.trim() || "Unassigned";
    stageCounts.set(stageLabel, (stageCounts.get(stageLabel) ?? 0) + 1);

    const beneficiary = Array.isArray(enrolment.beneficiaries)
      ? enrolment.beneficiaries[0]
      : enrolment.beneficiaries;
    if (!beneficiary) continue;
    if (beneficiary.safeguarding_flag === "follow_up_needed") safeguardingFollowUp += 1;
    if (beneficiary.consent_received) consentReceived += 1;
    if (includeBeneficiaryList && beneficiary.full_name) beneficiaryNames.push(beneficiary.full_name);
  }

  const scoreTotals = scorecardRows
    .map((row) => (row.total_score === null ? null : Number(row.total_score)))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageScore =
    scoreTotals.length > 0
      ? Math.round((scoreTotals.reduce((sum, value) => sum + value, 0) / scoreTotals.length) * 10) / 10
      : null;

  return {
    generated_at: new Date().toISOString(),
    report_type: reportType,
    report_period_label: reportPeriodLabel,
    audience_label: audienceLabel,
    include_evidence_appendix: includeEvidenceAppendix,
    programme: {
      id: programmeRaw.id,
      programme_code: programmeRaw.programme_code,
      name: programmeRaw.name,
      programme_type: programmeRaw.programme_type ?? "Programme",
      donor_funder: programmeRaw.donor_funder ?? "Adlai Heroes Foundation",
      status: programmeRaw.status ?? "draft",
      target_group: programmeRaw.target_group ?? "",
      objectives: programmeRaw.objectives ?? "",
      programme_description: programmeRaw.programme_description ?? "",
      locations: (programmeRaw.location_areas ?? []).filter(Boolean),
      start_date: programmeRaw.start_date ?? null,
      end_date: programmeRaw.end_date ?? null,
      reach_tracking_mode: programmeRaw.reach_tracking_mode ?? "beneficiary_registry",
      reach_unit_label: (programmeRaw.reach_unit_label ?? "beneficiaries").trim() || "beneficiaries",
      target_reach_count: targetReachCount,
      manual_actual_reach_count: programmeRaw.manual_actual_reach_count ?? null,
      actual_reach_count: actualReachCount,
      actual_reach_source:
        programmeRaw.reach_tracking_mode === "manual" ? "manual" : "beneficiary_registry",
      budget_ngn: programmeRaw.budget_ngn === null ? null : Number(programmeRaw.budget_ngn),
      funds_raised: fundsRaised,
      amount_left: amountLeft,
      progress_percent:
        targetReachCount && actualReachCount !== null && targetReachCount > 0
          ? Math.round((actualReachCount / targetReachCount) * 100)
          : null,
      drive_folder_id: programmeRaw.drive_folder_id ?? null,
      pipeline_template_key: programmeRaw.pipeline_template_key ?? null,
    },
    milestones: milestoneRows.map((row) => ({
      title: row.title,
      due_date: row.due_date,
      done: Boolean(row.done),
    })),
    notes: noteRows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        category: row.category,
        body: row.body,
        created_at: row.created_at,
        author: profile?.full_name || profile?.email || null,
      };
    }),
    evidence: {
      total: evidenceRows.length,
      verified: evidenceRows.filter((row) => row.verification_status === "verified").length,
      in_review: evidenceRows.filter((row) => row.verification_status === "in_review").length,
      pending: evidenceRows.filter((row) => row.verification_status === "consent_check").length,
      recent: evidenceRows.slice(0, 8).map((row) => ({
        title: row.title?.trim() || "Untitled evidence",
        evidence_type: row.evidence_type?.trim() || "Evidence",
        verification_status: row.verification_status?.trim() || "in_review",
        uploaded_at: row.uploaded_at,
        drive_file_id: row.drive_file_id,
      })),
    },
    beneficiaries: {
      relevant: programmeRaw.reach_tracking_mode !== "manual",
      count: beneficiaryIds.size,
      include_names: includeBeneficiaryList,
      names: beneficiaryNames.sort((left, right) => left.localeCompare(right)),
      stage_breakdown: [...stageCounts.entries()].map(([label, count]) => ({ label, count })),
      safeguarding_follow_up: safeguardingFollowUp,
      consent_received: consentReceived,
      education_scorecards: {
        enabled: usesEducationScorecard(programmeRaw.pipeline_template_key ?? null),
        total_scored: scoreTotals.length,
        average_score: averageScore,
      },
    },
    manual_reach_updates: reachUpdateRows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        previous_actual_count: row.previous_actual_count ?? null,
        new_actual_count: Number(row.new_actual_count ?? 0),
        note: row.note ?? null,
        created_at: row.created_at,
        author: profile?.full_name || profile?.email || null,
      };
    }),
  };
}

export function renderProgrammeReportDraft(context: ReportContext) {
  const targetLabel = context.programme.reach_unit_label || "beneficiaries";
  const actualCount = context.programme.actual_reach_count;
  const targetCount = context.programme.target_reach_count;
  const progressLine =
    targetCount !== null && actualCount !== null
      ? `${formatCount(actualCount)} of ${formatCount(targetCount)} ${targetLabel} reached`
      : actualCount !== null
        ? `${formatCount(actualCount)} ${targetLabel} reached`
        : targetCount !== null
          ? `Target reach set at ${formatCount(targetCount)} ${targetLabel}`
          : `Reach is being tracked in ${context.programme.actual_reach_source === "manual" ? "manual" : "beneficiary"} mode`;
  const gapLine =
    targetCount !== null && actualCount !== null
      ? actualCount > targetCount
        ? `The programme has exceeded its target by ${formatCount(actualCount - targetCount)} ${targetLabel}.`
        : `The remaining reach gap is ${formatCount(targetCount - actualCount)} ${targetLabel}.`
      : "";

  const lines = [
    context.report_type === "final"
      ? `${context.programme.name} Final Report`
      : `${context.programme.name} Interim Report`,
    `${context.programme.programme_code} · ${context.programme.programme_type}`,
    context.report_period_label ? `Report period: ${context.report_period_label}` : "",
    `Audience: ${context.audience_label || context.programme.donor_funder}`,
    `Generated on: ${formatDate(context.generated_at)}`,
    "",
    "Executive Summary",
    buildExecutiveSummary(context, progressLine, gapLine),
    "",
    "Project Objectives / Overview",
    joinSentences([
      context.programme.objectives,
      context.programme.programme_description,
      context.programme.target_group
        ? `Primary target group: ${context.programme.target_group}.`
        : "",
      context.programme.locations.length
        ? `Locations covered: ${context.programme.locations.join(", ")}.`
        : "",
      formatDateRangeSentence(context.programme.start_date, context.programme.end_date),
    ]),
    "",
    "Project Details / Activities",
    buildMilestonesSection(context),
    "",
    "Reach / Beneficiaries",
    buildReachSection(context, progressLine, gapLine),
    "",
    "Financial Analysis",
    buildFinanceSection(context),
    "",
    "Value and Impact",
    buildImpactSection(context),
    "",
    "Evidence / Moments Links",
    buildEvidenceSection(context),
    "",
    "Next Steps",
    buildNextStepsSection(context),
    "",
    "Conclusion / Appreciation",
    buildConclusionSection(context),
  ];

  if (context.include_evidence_appendix) {
    lines.push("", "Evidence Appendix", buildEvidenceAppendix(context));
  }

  if (context.beneficiaries.include_names && context.beneficiaries.names.length > 0) {
    lines.push("", "Beneficiary List", context.beneficiaries.names.map((name) => `- ${name}`).join("\n"));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function maybePolishReportDraftWithAi(context: ReportContext, draft: string) {
  const config = await resolveReportAiConfig();
  if (!config.enabled) {
    return {
      content: draft,
      usedAi: false,
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You rewrite NGO programme reports into clear donor-ready prose. Never invent facts, numbers, names, outcomes, dates, quotes, or expenses. Preserve structure and factual accuracy. Return plain text only.",
          },
          {
            role: "user",
            content: `Structured programme context:\n${JSON.stringify(context, null, 2)}\n\nDraft report:\n${draft}`,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`AI report request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("AI report response was empty.");
    }

    return {
      content,
      usedAi: true,
    };
  } catch {
    return {
      content: draft,
      usedAi: false,
    };
  }
}

export async function buildProgrammeReportDocxBuffer(
  title: string,
  content: string,
  context?: ReportContext | null,
) {
  const lines = content.split(/\r?\n/);
  const logoBytes = await loadAdlaiLogoBytes();
  const headerChildren = logoBytes
    ? [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: logoBytes,
              type: "jpg",
              transformation: {
                width: 88,
                height: 52,
              },
            }),
          ],
        }),
      ]
    : [];

  const metadataTable = context
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          makeMetadataRow("Programme code", context.programme.programme_code, "Report type", formatLabel(context.report_type)),
          makeMetadataRow("Donor / audience", context.audience_label || context.programme.donor_funder, "Report period", context.report_period_label || formatDateRangeLabel(context.programme.start_date, context.programme.end_date) || "Not specified"),
          makeMetadataRow("Generated on", formatDate(context.generated_at), "Prepared in", "ImpactOps reporting workflow"),
        ],
      })
    : null;

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [new TextRun({ text: "ADLAI IMPACTOPS", color: BRAND_COLORS.navy, bold: true, size: 20, font: "Comfortaa" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [new TextRun({ text: title, bold: true, color: BRAND_COLORS.navy, font: "Comfortaa" })],
    }),
  ];

  if (metadataTable) {
    children.push(metadataTable);
    children.push(
      new Paragraph({
        text: "",
        spacing: { after: 140 },
      }),
    );
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    const isSectionHeading =
      !trimmed.includes(".") &&
      trimmed.length <= 42 &&
      trimmed === trimmed.replace(/\s+/g, " ").trim() &&
      trimmed === capitalizeWords(trimmed);

    if (trimmed.startsWith("- ")) {
      children.push(
        new Paragraph({
          text: trimmed.slice(2),
          bullet: { level: 0 },
          spacing: { after: 100 },
        }),
      );
      continue;
    }

    children.push(
      new Paragraph(
        isSectionHeading
          ? {
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 120 },
              children: [new TextRun({ text: trimmed, bold: true, color: BRAND_COLORS.navy, font: "Comfortaa" })],
            }
          : {
              spacing: { after: 110 },
              children: [new TextRun(trimmed)],
            },
      ),
    );
  }

  const document = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: buildBrandedFooterChildren(),
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

const BRAND_COLORS = {
  navy: "1E3A8A",
  orange: "F97316",
  teal: "14B8A6",
  pink: "EC4899",
  slate: "64748B",
} as const;

function makeMetadataRow(leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) {
  return new TableRow({
    children: [
      makeMetadataCell(leftLabel, leftValue),
      makeMetadataCell(rightLabel, rightValue),
    ],
  });
}

function makeMetadataCell(label: string, value: string) {
  return new TableCell({
    shading: {
      fill: "F8FAFC",
      type: ShadingType.CLEAR,
      color: "auto",
    },
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: label.toUpperCase(),
            bold: true,
            color: BRAND_COLORS.slate,
            size: 18,
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: value, color: BRAND_COLORS.navy, bold: true })],
      }),
    ],
  });
}

function buildBrandedFooterChildren() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "Page ",
          color: BRAND_COLORS.slate,
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          color: BRAND_COLORS.slate,
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            makeFooterStripCell(BRAND_COLORS.orange),
            makeFooterStripCell(BRAND_COLORS.navy),
            makeFooterStripCell(BRAND_COLORS.teal),
            makeFooterStripCell(BRAND_COLORS.pink),
          ],
        }),
      ],
    }),
  ];
}

function makeFooterStripCell(color: string) {
  return new TableCell({
    shading: {
      fill: color,
      type: ShadingType.CLEAR,
      color: "auto",
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ text: "" })],
  });
}

async function loadAdlaiLogoBytes() {
  try {
    return await readFile(path.join(process.cwd(), "public", "adlai-logo.jpg"));
  } catch {
    return null;
  }
}

function buildExecutiveSummary(context: ReportContext, progressLine: string, gapLine: string) {
  return joinSentences([
    `${context.programme.name} is a ${context.report_type} report for ${context.programme.programme_type.toLowerCase()} delivery under ${context.programme.donor_funder}.`,
    progressLine ? `${progressLine}.` : "",
    gapLine,
    context.notes.length
      ? `Operational notes flagged for reporting: ${context.notes.length}.`
      : "No additional programme notes were flagged for inclusion at the time of generation.",
  ]);
}

function buildMilestonesSection(context: ReportContext) {
  if (!context.milestones.length) {
    return "No milestones have been logged yet. The report should be updated once delivery checkpoints are recorded.";
  }

  const completed = context.milestones.filter((row) => row.done);
  const outstanding = context.milestones.filter((row) => !row.done);
  const summary = [
    `Total milestones logged: ${context.milestones.length}.`,
    `Completed milestones: ${completed.length}.`,
    `Outstanding milestones: ${outstanding.length}.`,
  ];
  const topLines = context.milestones
    .slice(0, 5)
    .map(
      (row) =>
        `- ${row.title}${row.due_date ? ` (due ${formatDate(row.due_date)})` : ""}${row.done ? " — completed" : ""}`,
    )
    .join("\n");

  return `${summary.join(" ")}\n${topLines}`;
}

function buildReachSection(context: ReportContext, progressLine: string, gapLine: string) {
  const lines = [progressLine];
  if (gapLine) lines.push(gapLine);

  if (context.beneficiaries.relevant) {
    if (context.beneficiaries.stage_breakdown.length) {
      lines.push(
        `Stage breakdown: ${context.beneficiaries.stage_breakdown
          .map((row) => `${row.label} (${row.count})`)
          .join(", ")}.`,
      );
    }
    lines.push(
      `Consent on file for ${formatCount(context.beneficiaries.consent_received)} beneficiaries and safeguarding follow-up active for ${formatCount(context.beneficiaries.safeguarding_follow_up)}.`,
    );
    if (context.beneficiaries.education_scorecards.enabled) {
      lines.push(
        context.beneficiaries.education_scorecards.total_scored
          ? `Education selection scorecards have been completed for ${context.beneficiaries.education_scorecards.total_scored} enrolments with an average score of ${context.beneficiaries.education_scorecards.average_score ?? 0}/100.`
          : "No education scorecards have been completed yet.",
      );
    }
  } else if (context.manual_reach_updates.length) {
    lines.push(
      `Manual reach updates logged: ${context.manual_reach_updates
        .map((row) => `${formatDate(row.created_at)} (${formatCount(row.new_actual_count)})`)
        .join(", ")}.`,
    );
  }

  return lines.filter(Boolean).join(" ");
}

function buildFinanceSection(context: ReportContext) {
  const parts = [
    context.programme.budget_ngn !== null
      ? `Total budget: ${formatCurrency(context.programme.budget_ngn)}.`
      : "No budget has been recorded for this programme yet.",
    `Funds raised so far: ${formatCurrency(context.programme.funds_raised)}.`,
  ];

  if (context.programme.amount_left !== null) {
    parts.push(`Amount left to raise or allocate: ${formatCurrency(context.programme.amount_left)}.`);
  }

  return parts.join(" ");
}

function buildImpactSection(context: ReportContext) {
  if (!context.notes.length) {
    return "Impact notes have not yet been flagged for inclusion. Add outcomes and field observations to enrich the donor narrative.";
  }

  return context.notes
    .slice(0, 5)
    .map((row) => `- [${formatCategoryLabel(row.category)}] ${row.body}`)
    .join("\n");
}

function buildEvidenceSection(context: ReportContext) {
  if (!context.evidence.total) {
    return "No evidence files are linked to this programme yet.";
  }

  const recentLines = context.evidence.recent.slice(0, context.include_evidence_appendix ? 3 : 6)
    .map((row) => {
      const link = row.drive_file_id
        ? `https://drive.google.com/file/d/${row.drive_file_id}/view`
        : "";
      return `- ${row.title} (${row.evidence_type}, ${formatEvidenceStatus(row.verification_status)})${link ? ` — ${link}` : ""}`;
    })
    .join("\n");

  const appendixLine = context.include_evidence_appendix
    ? "A fuller evidence appendix is attached below."
    : "";

  return `Evidence logged: ${context.evidence.total}. Confirmed: ${context.evidence.verified}. In review: ${context.evidence.in_review}. Pending: ${context.evidence.pending}. ${appendixLine}`.trim() +
    `\n${recentLines}`;
}

function buildEvidenceAppendix(context: ReportContext) {
  if (!context.evidence.total) {
    return "No evidence appendix items are available.";
  }

  return context.evidence.recent
    .map((row) => {
      const link = row.drive_file_id
        ? `https://drive.google.com/file/d/${row.drive_file_id}/view`
        : "";
      const uploadedOn = row.uploaded_at ? ` · uploaded ${formatDate(row.uploaded_at)}` : "";
      return `- ${row.title} (${row.evidence_type}, ${formatEvidenceStatus(row.verification_status)}${uploadedOn})${link ? ` — ${link}` : ""}`;
    })
    .join("\n");
}

function buildNextStepsSection(context: ReportContext) {
  const nextSteps = context.notes.filter((row) => row.category === "next_step");
  if (nextSteps.length) {
    return nextSteps.map((row) => `- ${row.body}`).join("\n");
  }

  const outstandingMilestones = context.milestones.filter((row) => !row.done).slice(0, 5);
  if (outstandingMilestones.length) {
    return outstandingMilestones
      .map((row) => `- Complete ${row.title}${row.due_date ? ` by ${formatDate(row.due_date)}` : ""}.`)
      .join("\n");
  }

  return "Continue programme monitoring, note-taking, and evidence verification so the next report reflects current delivery accurately.";
}

function buildConclusionSection(context: ReportContext) {
  return joinSentences([
    `${context.programme.name} remains in ${formatStatusLabel(context.programme.status)} status.`,
    context.report_type === "final"
      ? "This report can now be reviewed, refined, and shared with donor stakeholders as the closing narrative for the programme."
      : "This interim report can now be refined in Google Docs and shared with internal or donor stakeholders for progress visibility.",
  ]);
}

function joinSentences(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function formatEvidenceStatus(value: string) {
  if (value === "verified") return "Confirmed";
  if (value === "consent_check") return "Pending";
  return "In review";
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatCategoryLabel(value: string) {
  return formatLabel(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
}

function formatCurrency(value: number) {
  return `NGN ${new Intl.NumberFormat("en-NG").format(value)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateRangeSentence(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) {
    return `The reporting period spans ${formatDate(startDate)} to ${formatDate(endDate)}.`;
  }
  if (startDate) {
    return `The programme started on ${formatDate(startDate)}.`;
  }
  if (endDate) {
    return `The programme is expected to conclude on ${formatDate(endDate)}.`;
  }
  return "";
}

function formatDateRangeLabel(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) {
    return `From ${formatDate(startDate)}`;
  }
  if (endDate) {
    return `Until ${formatDate(endDate)}`;
  }
  return "";
}

function capitalizeWords(value: string) {
  return value
    .split(/\s+/)
    .map((part) =>
      part ? part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join(" ");
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
