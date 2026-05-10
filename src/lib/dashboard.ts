import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type DashboardSignals = {
  approvalsPending: number;
  upcomingMilestones: number;
  upcomingMilestoneProgrammes: number;
  pipelineDistribution: Array<{ label: string; count: number }>;
};

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
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

    const [pendingRes, milestonesRes, pipelineRes] = await Promise.all([
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
      supabase
        .from("enrolments")
        .select("id,programme_stages:stage_id(label)")
        .limit(500),
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

    const pipelineRows: EnrolmentLite[] = (pipelineRes.data ?? []) as EnrolmentLite[];
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
