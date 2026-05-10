"use client";

import { useEffect, useState, useTransition } from "react";
import type { BeneficiaryRow } from "@/lib/beneficiaries";
import type { ProgrammeRow } from "@/lib/programmes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { SCORECARD_WEIGHTS, scorecardSuggestion } from "@/lib/programme-pipeline";
import {
  enrolBeneficiaryAction,
  listProgrammeStagesAction,
  moveEnrolmentStageAction,
  setEnrolmentDecisionAction,
  upsertScorecardAction,
} from "@/app/(protected)/beneficiaries/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type StageOption = { id: string; label: string; position: number };

export function BeneficiaryDetailSheet({
  beneficiary,
  open,
  onOpenChange,
  programmes,
}: {
  beneficiary: BeneficiaryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmes: ProgrammeRow[];
}) {
  const router = useRouter();
  const [enrolProgramme, setEnrolProgramme] = useState<string>("");
  const [enrolStages, setEnrolStages] = useState<StageOption[]>([]);
  const [enrolStage, setEnrolStage] = useState<string>("");
  const [enrolFeedback, setEnrolFeedback] = useState<string | null>(null);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [stageId, setStageId] = useState<string>("");
  const [decision, setDecision] = useState<string>("");
  const [decisionReason, setDecisionReason] = useState<string>("");
  const [scorecard, setScorecard] = useState({
    financial_need: 0,
    academic_record: 0,
    attendance_score: 0,
    cbt_readiness: 0,
    commitment: 0,
    notes: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isLive = Boolean(beneficiary?.enrolment_id);

  useEffect(() => {
    if (!open || !beneficiary) return;
    setStageId(beneficiary.stage_id ?? "");
    setDecision(beneficiary.decision ?? "");
    setDecisionReason(beneficiary.decision_reason ?? "");
    setScorecard({
      financial_need: beneficiary.scorecard?.financial_need ?? 0,
      academic_record: beneficiary.scorecard?.academic_record ?? 0,
      attendance_score: beneficiary.scorecard?.attendance_score ?? 0,
      cbt_readiness: beneficiary.scorecard?.cbt_readiness ?? 0,
      commitment: beneficiary.scorecard?.commitment ?? 0,
      notes: beneficiary.scorecard?.notes ?? "",
    });
    setFeedback(null);
    setEnrolProgramme("");
    setEnrolStage("");
    setEnrolStages([]);
    setEnrolFeedback(null);
    if (beneficiary.programme_id) {
      listProgrammeStagesAction(beneficiary.programme_id).then(setStages);
    } else {
      setStages([]);
    }
  }, [open, beneficiary]);

  useEffect(() => {
    if (!enrolProgramme) {
      setEnrolStages([]);
      setEnrolStage("");
      return;
    }
    listProgrammeStagesAction(enrolProgramme).then((rows) => {
      setEnrolStages(rows);
      setEnrolStage(rows[0]?.id ?? "");
    });
  }, [enrolProgramme]);

  if (!beneficiary) return null;

  const total =
    scorecard.financial_need +
    scorecard.academic_record +
    scorecard.attendance_score +
    scorecard.cbt_readiness +
    scorecard.commitment;
  const suggestion = scorecardSuggestion(total);

  function saveStage() {
    if (!beneficiary?.enrolment_id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await moveEnrolmentStageAction(
        beneficiary.enrolment_id!,
        stageId || null,
      );
      if (result.ok) setFeedback("Stage updated.");
      else setFeedback(result.error);
    });
  }

  function saveDecision() {
    if (!beneficiary?.enrolment_id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await setEnrolmentDecisionAction(
        beneficiary.enrolment_id!,
        decision,
        decisionReason,
      );
      if (result.ok) setFeedback("Decision saved.");
      else setFeedback(result.error);
    });
  }

  function saveScorecard() {
    if (!beneficiary?.enrolment_id) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertScorecardAction(beneficiary.enrolment_id!, scorecard);
      if (result.ok) setFeedback("Scorecard saved.");
      else setFeedback(result.error);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {beneficiary.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">{beneficiary.full_name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {beneficiary.beneficiary_code}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 flex flex-wrap gap-1.5">
          <Badge variant="default" className="font-normal">
            {formatStatus(beneficiary.consent_status)}
          </Badge>
          <Badge
            variant={beneficiary.risk_flag === "review" ? "destructive" : "secondary"}
            className="font-normal"
          >
            {beneficiary.risk_flag === "review" ? "Safeguarding review" : "Risk clear"}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {formatStatus(beneficiary.current_status)}
          </Badge>
          {beneficiary.stage_label ? (
            <Badge variant="outline" className="font-normal">
              {beneficiary.stage_label}
            </Badge>
          ) : null}
        </div>

        <DetailSection title="Personal & contact">
          <DetailItem label="Guardian" value={beneficiary.guardian_name} />
          <DetailItem label="Phone" value={beneficiary.guardian_phone} />
          <DetailItem label="Community" value={beneficiary.community} />
          <DetailItem label="State" value={beneficiary.state} />
          <DetailItem label="School" value={beneficiary.school_name} />
        </DetailSection>

        <DetailSection title="Programme">
          <DetailItem label="Name" value={beneficiary.programme_name} />
          <DetailItem label="Code" value={beneficiary.programme_code ?? "Not linked"} />
        </DetailSection>

        {!isLive && beneficiary.id ? (
          <DetailSection title="Enrol in a programme">
            <div className="flex gap-2">
              <Select value={enrolProgramme} onValueChange={setEnrolProgramme}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes
                    .filter((p) => !!p.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id!}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {enrolStages.length > 0 ? (
              <Select value={enrolStage} onValueChange={setEnrolStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Starting stage" />
                </SelectTrigger>
                <SelectContent>
                  {enrolStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : enrolProgramme ? (
              <p className="text-xs text-muted-foreground">
                This programme has no stages defined yet — you can enrol without a stage.
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={pending || !enrolProgramme || !beneficiary.id}
              onClick={() => {
                if (!beneficiary?.id || !enrolProgramme) return;
                setEnrolFeedback(null);
                startTransition(async () => {
                  const result = await enrolBeneficiaryAction(
                    beneficiary.id!,
                    enrolProgramme,
                    enrolStage || null,
                  );
                  if (result.ok) {
                    setEnrolFeedback("Enrolled — refreshing.");
                    onOpenChange(false);
                    router.refresh();
                  } else {
                    setEnrolFeedback(result.error);
                  }
                });
              }}
            >
              Enrol beneficiary
            </Button>
            {enrolFeedback ? (
              <p
                className={cn(
                  "text-xs",
                  enrolFeedback.startsWith("Enrolled") ? "text-emerald-700" : "text-destructive",
                )}
              >
                {enrolFeedback}
              </p>
            ) : null}
          </DetailSection>
        ) : null}

        {isLive ? (
          <DetailSection title="Pipeline stage">
            <div className="flex gap-2">
              <Select
                value={stageId}
                onValueChange={setStageId}
                disabled={!stages.length}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={stages.length ? "Choose stage" : "No stages defined"} />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={saveStage}
                disabled={pending || stageId === (beneficiary.stage_id ?? "")}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
              </Button>
            </div>
            {!stages.length && beneficiary.programme_id ? (
              <p className="text-xs text-muted-foreground mt-1">
                Define stages on the programme first.
              </p>
            ) : null}
          </DetailSection>
        ) : null}

        {isLive ? (
          <DetailSection title="Decision">
            <Select value={decision || "_none"} onValueChange={(v) => setDecision(v === "_none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No decision yet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No decision yet</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="deferred">Deferred to readiness</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={decisionReason}
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder="Reason or note for this decision (optional)"
              rows={2}
            />
            <Button type="button" size="sm" onClick={saveDecision} disabled={pending}>
              Save decision
            </Button>
          </DetailSection>
        ) : null}

        {isLive ? (
          <DetailSection title="Selection scorecard">
            <ScoreField
              label="Financial need"
              max={SCORECARD_WEIGHTS.financial_need}
              value={scorecard.financial_need}
              onChange={(v) => setScorecard((s) => ({ ...s, financial_need: v }))}
            />
            <ScoreField
              label="School academic record"
              max={SCORECARD_WEIGHTS.academic_record}
              value={scorecard.academic_record}
              onChange={(v) => setScorecard((s) => ({ ...s, academic_record: v }))}
            />
            <ScoreField
              label="Attendance & commitment"
              max={SCORECARD_WEIGHTS.attendance_score}
              value={scorecard.attendance_score}
              onChange={(v) => setScorecard((s) => ({ ...s, attendance_score: v }))}
            />
            <ScoreField
              label="CBT & exam-readiness"
              max={SCORECARD_WEIGHTS.cbt_readiness}
              value={scorecard.cbt_readiness}
              onChange={(v) => setScorecard((s) => ({ ...s, cbt_readiness: v }))}
            />
            <ScoreField
              label="Guardian & student commitment"
              max={SCORECARD_WEIGHTS.commitment}
              value={scorecard.commitment}
              onChange={(v) => setScorecard((s) => ({ ...s, commitment: v }))}
            />
            <Textarea
              value={scorecard.notes}
              onChange={(event) => setScorecard((s) => ({ ...s, notes: event.target.value }))}
              placeholder="Notes on readiness, gaps, or follow-up"
              rows={2}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total: {total}/100</span>
              <Badge
                className={cn(
                  "font-normal",
                  suggestion.decision === "approved"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : suggestion.decision === "deferred"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-rose-100 text-rose-700 border-rose-200",
                )}
              >
                {suggestion.label}
              </Badge>
            </div>
            <Button type="button" size="sm" onClick={saveScorecard} disabled={pending}>
              Save scorecard
            </Button>
          </DetailSection>
        ) : null}

        {feedback ? (
          <p
            className={cn(
              "text-xs mt-4",
              feedback.endsWith("updated.") || feedback.endsWith("saved.")
                ? "text-emerald-700"
                : "text-destructive",
            )}
          >
            {feedback}
          </p>
        ) : null}

        {!isLive ? (
          <p className="text-xs text-muted-foreground mt-6">
            Pipeline actions are available for live records only.
          </p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ScoreField({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <Input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
