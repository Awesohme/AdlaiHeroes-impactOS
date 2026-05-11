"use client";

import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { EnrolmentSummary } from "@/app/(protected)/programmes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  SCORECARD_RUBRICS,
  SCORECARD_WEIGHTS,
  scorecardSuggestion,
} from "@/lib/programme-pipeline";
import {
  clearBeneficiaryConsentAction,
  moveEnrolmentStageAction,
  uploadConsentEvidenceAction,
  upsertScorecardAction,
} from "@/app/(protected)/beneficiaries/actions";
import { BeneficiaryNotesSection } from "@/components/beneficiaries/beneficiary-notes-section";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type StageOption = { id: string; label: string; position: number };

export function PipelineSidePanel({
  enrolment,
  stages,
  programmeId,
}: {
  enrolment: EnrolmentSummary | null;
  stages: StageOption[];
  programmeId: string | null;
}) {
  const router = useRouter();
  const [scorecard, setScorecard] = useState({
    financial_need: 0,
    academic_record: 0,
    attendance_score: 0,
    cbt_readiness: 0,
    commitment: 0,
    notes: "",
  });
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!enrolment) return;
    setScorecard({
      financial_need: enrolment.scorecard?.financial_need ?? 0,
      academic_record: enrolment.scorecard?.academic_record ?? 0,
      attendance_score: enrolment.scorecard?.attendance_score ?? 0,
      cbt_readiness: enrolment.scorecard?.cbt_readiness ?? 0,
      commitment: enrolment.scorecard?.commitment ?? 0,
      notes: "",
    });
    setConsentFile(null);
    setFeedback(null);
  }, [enrolment?.enrolment_id, enrolment]);

  if (!enrolment) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Pick a beneficiary card to start processing.
      </div>
    );
  }

  const currentIndex = stages.findIndex((s) => s.id === enrolment.stage_id);
  const canMoveBack = currentIndex > 0;
  const canMoveForward = currentIndex >= 0 && currentIndex < stages.length - 1;
  const prevStage = canMoveBack ? stages[currentIndex - 1] : null;
  const nextStage = canMoveForward ? stages[currentIndex + 1] : null;

  function moveStage(stageId: string | null) {
    setFeedback(null);
    startTransition(async () => {
      const result = await moveEnrolmentStageAction(enrolment!.enrolment_id, stageId);
      if (result.ok) {
        setFeedback("Stage updated.");
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  function uploadConsent() {
    if (!consentFile) return;
    setFeedback(null);
    const fd = new FormData();
    fd.set("consent_file", consentFile);
    startTransition(async () => {
      const result = await uploadConsentEvidenceAction(enrolment!.beneficiary_id, fd);
      if (result.ok) {
        setConsentFile(null);
        setFeedback(result.data?.warning ?? "Consent uploaded.");
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  function clearConsent() {
    if (typeof window !== "undefined" && !window.confirm("Clear consent? The evidence record stays as history.")) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await clearBeneficiaryConsentAction(enrolment!.beneficiary_id);
      if (result.ok) {
        setFeedback("Consent cleared.");
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  function saveScorecard() {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertScorecardAction(enrolment!.enrolment_id, scorecard);
      if (result.ok) {
        setFeedback("Scorecard saved.");
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  const total =
    scorecard.financial_need +
    scorecard.academic_record +
    scorecard.attendance_score +
    scorecard.cbt_readiness +
    scorecard.commitment;
  const suggestion = scorecardSuggestion(total);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground">{enrolment.beneficiary_code}</p>
        <h3 className="text-base font-semibold tracking-tight">{enrolment.beneficiary_name}</h3>
        <div className="flex flex-wrap gap-1.5">
          {enrolment.stage_label ? (
            <Badge variant="outline" className="font-normal">
              {enrolment.stage_label}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              Unstaged
            </Badge>
          )}
          <Badge
            variant={enrolment.consent_received ? "default" : "secondary"}
            className="font-normal"
          >
            {enrolment.consent_received ? "Consent ✓" : "No consent"}
          </Badge>
        </div>
      </header>

      <Section title="Move stage">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMoveBack || pending}
            onClick={() => prevStage && moveStage(prevStage.id)}
            className="flex-1"
          >
            ← {prevStage?.label ?? "Back"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canMoveForward || pending}
            onClick={() => nextStage && moveStage(nextStage.id)}
            className="flex-1"
          >
            {nextStage?.label ?? "Next"} →
          </Button>
        </div>
        {!stages.length ? (
          <p className="text-xs text-muted-foreground">
            Define stages on the programme first.
          </p>
        ) : null}
      </Section>

      <Section title="Consent">
        {enrolment.consent_received ? (
          <div className="rounded-md border bg-emerald-50/60 p-3 space-y-1 text-sm">
            <p className="font-medium text-emerald-700">Consent received</p>
            {enrolment.consent_recorded_at ? (
              <p className="text-xs text-muted-foreground">
                On {formatDate(enrolment.consent_recorded_at)}
              </p>
            ) : null}
            {enrolment.consent_drive_file_id ? (
              <a
                href={`https://drive.google.com/file/d/${enrolment.consent_drive_file_id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View file <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No consent on file yet. Upload the signed form — that&apos;s what records it.
          </p>
        )}
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(event) => setConsentFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !consentFile}
            onClick={uploadConsent}
          >
            {enrolment.consent_received ? "Replace" : "Upload consent"}
          </Button>
          {enrolment.consent_received ? (
            <button
              type="button"
              onClick={clearConsent}
              disabled={pending}
              className="text-xs text-muted-foreground hover:text-destructive hover:underline"
            >
              Clear consent
            </button>
          ) : null}
        </div>
      </Section>

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            Scorecard
            <InfoTooltip content="Five weighted areas summing to 100. Bands are guidance, not strict rules." />
          </span>
        }
      >
        <ScoreField
          label="Financial need"
          max={SCORECARD_WEIGHTS.financial_need}
          value={scorecard.financial_need}
          onChange={(v) => setScorecard((s) => ({ ...s, financial_need: v }))}
          rubric={SCORECARD_RUBRICS.financial_need}
        />
        <ScoreField
          label="Academic record"
          max={SCORECARD_WEIGHTS.academic_record}
          value={scorecard.academic_record}
          onChange={(v) => setScorecard((s) => ({ ...s, academic_record: v }))}
          rubric={SCORECARD_RUBRICS.academic_record}
        />
        <ScoreField
          label="Attendance & commitment"
          max={SCORECARD_WEIGHTS.attendance_score}
          value={scorecard.attendance_score}
          onChange={(v) => setScorecard((s) => ({ ...s, attendance_score: v }))}
          rubric={SCORECARD_RUBRICS.attendance_score}
        />
        <ScoreField
          label="CBT readiness"
          max={SCORECARD_WEIGHTS.cbt_readiness}
          value={scorecard.cbt_readiness}
          onChange={(v) => setScorecard((s) => ({ ...s, cbt_readiness: v }))}
          rubric={SCORECARD_RUBRICS.cbt_readiness}
        />
        <ScoreField
          label="Guardian & student commitment"
          max={SCORECARD_WEIGHTS.commitment}
          value={scorecard.commitment}
          onChange={(v) => setScorecard((s) => ({ ...s, commitment: v }))}
          rubric={SCORECARD_RUBRICS.commitment}
        />
        <Textarea
          value={scorecard.notes}
          onChange={(event) => setScorecard((s) => ({ ...s, notes: event.target.value }))}
          placeholder="Optional scorecard notes"
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
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save scorecard"}
        </Button>
      </Section>

      <BeneficiaryNotesSection
        beneficiaryId={enrolment.beneficiary_id}
        enrolmentId={enrolment.enrolment_id}
        programmeId={programmeId}
      />

      {feedback ? (
        <p
          className={cn(
            "text-xs",
            feedback.endsWith("uploaded.") ||
              feedback.endsWith("saved.") ||
              feedback.endsWith("updated.") ||
              feedback.endsWith("cleared.")
              ? "text-emerald-700"
              : "text-destructive",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function ScoreField({
  label,
  max,
  value,
  onChange,
  rubric,
}: {
  label: string;
  max: number;
  value: number;
  onChange: (v: number) => void;
  rubric: { helper: string; bands: string[] };
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap justify-between text-xs gap-1">
        <span className="inline-flex items-center gap-1">
          <Label className="text-xs">{label}</Label>
          <InfoTooltip
            content={
              <div className="space-y-1">
                <p>{rubric.helper}</p>
                <ul className="list-disc pl-3 space-y-0.5">
                  {rubric.bands.map((band) => (
                    <li key={band}>{band}</li>
                  ))}
                </ul>
              </div>
            }
          />
        </span>
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

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
