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

export function scorecardSuggestion(total: number): {
  decision: "approved" | "deferred" | "declined";
  label: string;
} {
  if (total >= 70) return { decision: "approved", label: "Suggest: Approve" };
  if (total >= 50) return { decision: "deferred", label: "Suggest: Defer" };
  return { decision: "declined", label: "Suggest: Decline" };
}
