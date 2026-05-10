export const EDUCATION_SPONSORSHIP_STAGES = [
  { key: "nominated", label: "Nominated", is_terminal: false },
  { key: "validated", label: "Validated", is_terminal: false },
  { key: "approved", label: "Approved", is_terminal: false },
  { key: "deferred", label: "Deferred", is_terminal: false },
  { key: "in_prep", label: "In Prep", is_terminal: false },
  { key: "exam", label: "Exam", is_terminal: false },
  { key: "completed", label: "Completed", is_terminal: true },
  { key: "declined", label: "Declined", is_terminal: true },
];

export const SCORECARD_WEIGHTS = {
  financial_need: 25,
  academic_record: 35,
  attendance_score: 15,
  cbt_readiness: 15,
  commitment: 10,
} as const;

export function scorecardTotal(score: {
  financial_need: number;
  academic_record: number;
  attendance_score: number;
  cbt_readiness: number;
  commitment: number;
}) {
  return (
    score.financial_need +
    score.academic_record +
    score.attendance_score +
    score.cbt_readiness +
    score.commitment
  );
}

export const SCORECARD_RUBRICS: Record<
  "financial_need" | "academic_record" | "attendance_score" | "cbt_readiness" | "commitment",
  { helper: string; bands: string[] }
> = {
  financial_need: {
    helper: "What financial barrier to exam access does the family face?",
    bands: [
      "0–5: no clear barrier evidenced",
      "6–12: some constraint, exam still affordable",
      "13–19: clear barrier, exam access at risk",
      "20–25: severe barrier, exam access impossible without support",
    ],
  },
  academic_record: {
    helper: "Sustained performance via term results / continuous assessment.",
    bands: [
      "0–9: no documented performance",
      "10–18: inconsistent passing performance",
      "19–26: steady passing performance with school documentation",
      "27–35: strong sustained performance + teacher / principal endorsement",
    ],
  },
  attendance_score: {
    helper: "Attendance, discipline, and engagement at school or learning centre.",
    bands: [
      "0–4: frequent absences, low engagement",
      "5–9: irregular but improving",
      "10–15: consistent attendance, school confirms discipline",
    ],
  },
  cbt_readiness: {
    helper: "Computer familiarity, exam anxiety, ability to navigate CBT basics.",
    bands: [
      "0–4: no computer familiarity, high anxiety",
      "5–9: some exposure, manageable readiness risk",
      "10–15: confident with CBT, low risk",
    ],
  },
  commitment: {
    helper: "Guardian + student responsibility to attend check-ins and sit the exam.",
    bands: [
      "0–3: limited engagement / consent uncertainty",
      "4–6: engaged guardian, some doubts",
      "7–10: strong commitment, consent + availability confirmed",
    ],
  },
};

export const TERMINAL_STAGE_LABELS = new Set(["Completed", "Declined", "Exited"]);

export function scorecardSuggestion(total: number): {
  decision: "approved" | "deferred" | "declined";
  label: string;
} {
  if (total >= 70) return { decision: "approved", label: "Suggest: Approve" };
  if (total >= 50) return { decision: "deferred", label: "Suggest: Defer" };
  return { decision: "declined", label: "Suggest: Decline" };
}
