import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { addDays, lagosToday, toIsoDate } from "@/lib/dates";
import { isEnrolmentActive } from "@/lib/beneficiaries";

export type DashboardSignals = {
  approvalsPending: number;
  upcomingMilestones: number;
  upcomingMilestoneProgrammes: number;
  pipelineDistribution: Array<{ label: string; count: number }>;
};

export type DashboardSnapshot = {
  counters: {
    programmes: { total: number; active: number };
    beneficiaries: { total: number; active: number };
    evidence: { total: number; confirmed: number };
    needsAttention: number;
  };
  recentRecords: Array<{
    type: "Programme" | "Beneficiary" | "Evidence";
    title: string;
    detail: string;
  }>;
  signals: DashboardSignals;
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!hasSupabaseBrowserEnv()) {
    return emptyDashboardSnapshot();
  }

  try {
    const supabase = await createClient();
    const today = lagosToday();
    const sevenDaysLater = addDays(today, 7);

    const [
      programmesRecentRes,
      programmesTotalRes,
      programmesActiveRes,
      beneficiariesRecentRes,
      beneficiariesTotalRes,
      beneficiariesFlaggedRes,
      enrolmentsRes,
      evidenceRecentRes,
      evidenceTotalRes,
      evidenceConfirmedRes,
      milestonesRes,
    ] = await Promise.all([
      supabase
        .from("programmes")
        .select("id,name,programme_code,status")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("programmes")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
      supabase
        .from("programmes")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .eq("status", "active"),
      supabase
        .from("beneficiaries")
        .select("id,beneficiary_code,full_name,safeguarding_flag")
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("safeguarding_flag", "follow_up_needed"),
      supabase
        .from("enrolments")
        .select("id,status,beneficiary_id,programme_stages:stage_id(label)")
        .limit(500),
      supabase
        .from("evidence")
        .select("id,evidence_code,title,verification_status")
        .order("uploaded_at", { ascending: false })
        .limit(2),
      supabase
        .from("evidence")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("evidence")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified"),
      supabase
        .from("programme_milestones")
        .select("id,programme_id,due_date,done")
        .eq("done", false)
        .gte("due_date", toIsoDate(today))
        .lte("due_date", toIsoDate(sevenDaysLater))
        .limit(200),
    ]);

    const programmes = programmesRecentRes.data ?? [];
    const beneficiaries = beneficiariesRecentRes.data ?? [];
    const evidence = evidenceRecentRes.data ?? [];
    const milestones = milestonesRes.data ?? [];

    type EnrolmentLite = {
      id: string;
      beneficiary_id: string | null;
      status: string | null;
      programme_stages?: { label?: string | null } | { label?: string | null }[] | null;
    };

    const enrolments: EnrolmentLite[] = (enrolmentsRes.data ?? []) as EnrolmentLite[];
    const activeBeneficiaryIds = new Set(
      enrolments
        .filter((row) => {
          const stage = Array.isArray(row.programme_stages) ? row.programme_stages[0] : row.programme_stages;
          return isEnrolmentActive({
            enrolment_id: row.id ?? null,
            current_status: row.status ?? "pending",
            stage_label: stage?.label ?? null,
          });
        })
        .map((row) => row.beneficiary_id)
        .filter((value): value is string => Boolean(value)),
    );

    const approvalsPending = enrolments.filter((row) => {
      const stage = Array.isArray(row.programme_stages) ? row.programme_stages[0] : row.programme_stages;
      const label = stage?.label;
      return label === "Nominated" || label === "Validated";
    }).length;

    const pipelineCounts = new Map<string, number>();
    for (const row of enrolments) {
      const stage = Array.isArray(row.programme_stages) ? row.programme_stages[0] : row.programme_stages;
      const label = stage?.label || "Unstaged";
      pipelineCounts.set(label, (pipelineCounts.get(label) ?? 0) + 1);
    }

    const pipelineDistribution = [...pipelineCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    const milestoneProgrammes = new Set(milestones.map((row) => row.programme_id).filter(Boolean));

    const recentRecords = [
      ...programmes.slice(0, 2).map((row) => ({
        type: "Programme" as const,
        title: row.name ?? "Untitled programme",
        detail: `${row.programme_code ?? "PRG"} • ${formatLabel(row.status ?? "draft")}`,
      })),
      ...beneficiaries.slice(0, 2).map((row) => ({
        type: "Beneficiary" as const,
        title: row.full_name ?? "Unnamed beneficiary",
        detail: row.beneficiary_code ?? "BEN-UNSET",
      })),
      ...evidence.slice(0, 2).map((row) => ({
        type: "Evidence" as const,
        title: row.title ?? "Untitled evidence",
        detail: `${row.evidence_code ?? "EVD"} • ${formatEvidenceStatus(row.verification_status ?? "in_review")}`,
      })),
    ].slice(0, 6);

    const confirmedEvidenceCount = evidenceConfirmedRes.count ?? 0;
    const needsAttention =
      (beneficiariesFlaggedRes.count ?? 0) +
      Math.max((evidenceTotalRes.count ?? 0) - confirmedEvidenceCount, 0);

    return {
      counters: {
        programmes: {
          total: programmesTotalRes.count ?? 0,
          active: programmesActiveRes.count ?? 0,
        },
        beneficiaries: {
          total: beneficiariesTotalRes.count ?? 0,
          active: activeBeneficiaryIds.size,
        },
        evidence: {
          total: evidenceTotalRes.count ?? 0,
          confirmed: confirmedEvidenceCount,
        },
        needsAttention,
      },
      recentRecords,
      signals: {
        approvalsPending,
        upcomingMilestones: milestones.length,
        upcomingMilestoneProgrammes: milestoneProgrammes.size,
        pipelineDistribution,
      },
    };
  } catch {
    return emptyDashboardSnapshot();
  }
}

export async function getDashboardSignals(): Promise<DashboardSignals> {
  if (!hasSupabaseBrowserEnv()) {
    return {
      approvalsPending: 0,
      upcomingMilestones: 0,
      upcomingMilestoneProgrammes: 0,
      pipelineDistribution: [],
    };
  }
  try {
    const supabase = await createClient();
    const today = lagosToday();
    const sevenDaysLater = addDays(today, 7);

    const [pendingRes, milestonesRes] = await Promise.all([
      supabase
        .from("enrolments")
        .select("id,programme_stages:stage_id(label)")
        .limit(500),
      supabase
        .from("programme_milestones")
        .select("id,programme_id,due_date,done")
        .eq("done", false)
        .gte("due_date", toIsoDate(today))
        .lte("due_date", toIsoDate(sevenDaysLater))
        .limit(200),
    ]);

    type EnrolmentLite = { id: string; programme_stages?: { label?: string } | { label?: string }[] | null };

    const enrolments: EnrolmentLite[] = (pendingRes.data ?? []) as EnrolmentLite[];
    const approvalsPending = enrolments.filter((row) => {
      const stage = Array.isArray(row.programme_stages) ? row.programme_stages[0] : row.programme_stages;
      const label = stage?.label;
      return label === "Nominated" || label === "Validated";
    }).length;

    const milestones = milestonesRes.data ?? [];
    const programmeSet = new Set(milestones.map((m) => m.programme_id));

    const pipelineRows: EnrolmentLite[] = enrolments;
    const counts = new Map<string, number>();
    for (const row of pipelineRows) {
      const stage = Array.isArray(row.programme_stages) ? row.programme_stages[0] : row.programme_stages;
      const label = stage?.label || "Unstaged";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const pipelineDistribution = [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      approvalsPending,
      upcomingMilestones: milestones.length,
      upcomingMilestoneProgrammes: programmeSet.size,
      pipelineDistribution,
    };
  } catch {
    return {
      approvalsPending: 0,
      upcomingMilestones: 0,
      upcomingMilestoneProgrammes: 0,
      pipelineDistribution: [],
    };
  }
}

function emptyDashboardSnapshot(): DashboardSnapshot {
  return {
    counters: {
      programmes: { total: 0, active: 0 },
      beneficiaries: { total: 0, active: 0 },
      evidence: { total: 0, confirmed: 0 },
      needsAttention: 0,
    },
    recentRecords: [],
    signals: {
      approvalsPending: 0,
      upcomingMilestones: 0,
      upcomingMilestoneProgrammes: 0,
      pipelineDistribution: [],
    },
  };
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEvidenceStatus(value: string) {
  if (value === "verified") return "Confirmed";
  if (value === "consent_check") return "Pending";
  if (value === "in_review") return "In review";
  return formatLabel(value);
}
