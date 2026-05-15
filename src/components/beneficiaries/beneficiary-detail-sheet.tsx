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
import { Loader2, Trash2 } from "lucide-react";
import {
  SCORECARD_RUBRICS,
  SCORECARD_WEIGHTS,
  scorecardSuggestion,
} from "@/lib/programme-pipeline";
import {
  clearBeneficiaryConsentAction,
  deleteBeneficiaryAction,
  enrolBeneficiaryAction,
  listProgrammeStagesAction,
  moveEnrolmentStageAction,
  setBeneficiarySafeguardingAction,
  uploadConsentEvidenceAction,
  upsertScorecardAction,
} from "@/app/(protected)/beneficiaries/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/info-tooltip";
import { BeneficiaryNotesSection } from "@/components/beneficiaries/beneficiary-notes-section";
import { EnrolmentFieldsSection } from "@/components/beneficiaries/enrolment-fields-section";
import { BeneficiaryAvatar } from "@/components/beneficiaries/beneficiary-avatar";
import { MediaPreview } from "@/components/media-preview";
import {
  uploadBeneficiaryProfileImageAction,
} from "@/app/(protected)/beneficiaries/actions";
import { SearchableSelect } from "@/components/searchable-select";

type StageOption = { id: string; label: string; position: number };

const safeguardingOptions = [
  {
    value: "none",
    label: "None",
    helper: "No concerns identified.",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    helper: "A concern was raised and resolved.",
  },
  {
    value: "follow_up_needed",
    label: "Follow-up needed",
    helper: "Active concern requiring attention before further programming.",
  },
];

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
  const [safeguarding, setSafeguarding] = useState<string>("none");
  const [safeguardingFeedback, setSafeguardingFeedback] = useState<string | null>(null);
  const [consentReceived, setConsentReceived] = useState(false);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [consentFeedback, setConsentFeedback] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [consentDriveFileId, setConsentDriveFileId] = useState<string | null>(null);
  const [consentRecordedAt, setConsentRecordedAt] = useState<string | null>(null);
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
    setSafeguarding(beneficiary.safeguarding_flag ?? "none");
    setSafeguardingFeedback(null);
    setConsentReceived(beneficiary.consent_received);
    setConsentDriveFileId(beneficiary.consent_evidence_drive_file_id);
    setConsentRecordedAt(beneficiary.consent_recorded_at);
    setConsentFile(null);
    setConsentFeedback(null);
    setPhotoFile(null);
    setPhotoFeedback(null);
    setDeleteOpen(false);
    setDeleteCode("");
    setDeleteConfirmed(false);
    setDeleteFeedback(null);
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
  const consentEnrolmentReady = isLive;

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

  function saveSafeguarding() {
    if (!beneficiary?.id) return;
    setSafeguardingFeedback(null);
    startTransition(async () => {
      const result = await setBeneficiarySafeguardingAction(beneficiary.id!, safeguarding);
      if (result.ok) setSafeguardingFeedback("Safeguarding updated.");
      else setSafeguardingFeedback(result.error);
    });
  }

  function uploadConsent() {
    if (!beneficiary?.id || !consentFile) return;
    setConsentFeedback(null);
    const fd = new FormData();
    fd.set("consent_file", consentFile);
    startTransition(async () => {
      const result = await uploadConsentEvidenceAction(beneficiary.id!, fd);
      if (result.ok) {
        setConsentReceived(true);
        setConsentDriveFileId(result.data?.driveFileId ?? null);
        setConsentRecordedAt(new Date().toISOString());
        setConsentFile(null);
        setConsentFeedback(result.data?.warning ?? "Consent uploaded.");
      } else {
        setConsentFeedback(result.error);
      }
    });
  }

  function clearConsent() {
    if (!beneficiary?.id) return;
    if (typeof window !== "undefined" && !window.confirm("Clear consent for this beneficiary? The evidence record stays as history.")) {
      return;
    }
    setConsentFeedback(null);
    startTransition(async () => {
      const result = await clearBeneficiaryConsentAction(beneficiary.id!);
      if (result.ok) {
        setConsentReceived(false);
        setConsentDriveFileId(null);
        setConsentRecordedAt(null);
        setConsentFile(null);
        setConsentFeedback("Consent cleared.");
      } else {
        setConsentFeedback(result.error);
      }
    });
  }

  function uploadPhoto() {
    if (!beneficiary?.id || !photoFile) return;
    setPhotoFeedback(null);
    const fd = new FormData();
    fd.set("profile_image", photoFile);
    startTransition(async () => {
      const result = await uploadBeneficiaryProfileImageAction(beneficiary.id!, fd);
      if (result.ok) {
        setPhotoFile(null);
        setPhotoFeedback("Profile image saved.");
        router.refresh();
      } else {
        setPhotoFeedback(result.error);
      }
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

  function deleteBeneficiary() {
    if (!beneficiary?.id) return;
    setDeleteFeedback(null);
    startTransition(async () => {
      const result = await deleteBeneficiaryAction({
        beneficiaryId: beneficiary.id!,
        beneficiaryCode: deleteCode,
        confirmed: deleteConfirmed,
      });
      if (result.ok) {
        setDeleteFeedback("Beneficiary deleted.");
        onOpenChange(false);
        router.refresh();
      } else {
        setDeleteFeedback(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <BeneficiaryAvatar
              name={beneficiary.full_name}
              driveFileId={beneficiary.profile_image_drive_file_id}
              className="h-12 w-12"
            />
            <div className="min-w-0">
              <SheetTitle className="text-base">{beneficiary.full_name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {beneficiary.beneficiary_code}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 flex flex-wrap gap-1.5">
          <Badge
            variant={consentReceived ? "default" : "secondary"}
            className="font-normal"
          >
            {consentReceived ? "Consent received" : "Consent not received"}
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

        <DetailSection title="Profile image">
          {beneficiary.profile_image_drive_file_id ? (
            <div className="flex items-center gap-3">
              <BeneficiaryAvatar
                name={beneficiary.full_name}
                driveFileId={beneficiary.profile_image_drive_file_id}
                className="h-16 w-16"
              />
              <div className="text-xs text-muted-foreground space-y-1 min-w-0">
                <p>JPG/PNG/WebP, up to 8 MB.</p>
                <p>Uploading a new file replaces the current one.</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No photo yet. Upload a JPG/PNG/WebP up to 8 MB.
            </p>
          )}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !photoFile}
            onClick={uploadPhoto}
          >
            {beneficiary.profile_image_drive_file_id ? "Replace photo" : "Upload photo"}
          </Button>
          {photoFeedback ? (
            <p
              className={cn(
                "text-xs",
                photoFeedback === "Profile image saved."
                  ? "text-emerald-700"
                  : "text-destructive",
              )}
            >
              {photoFeedback}
            </p>
          ) : null}
        </DetailSection>

        <DetailSection title="Personal & contact">
          <DetailItem label="Guardian" value={beneficiary.guardian_name} />
          <DetailItem label="Phone" value={beneficiary.guardian_phone} />
          <DetailItem label="Community" value={beneficiary.community} />
          <DetailItem label="State" value={beneficiary.state} />
        </DetailSection>

        <DetailSection title="Programme">
          <DetailItem label="Name" value={beneficiary.programme_name} />
          <DetailItem label="Code" value={beneficiary.programme_code ?? "Not linked"} />
        </DetailSection>

        {!isLive && beneficiary.id ? (
          <DetailSection title="Enrol in a programme">
            <div className="flex gap-2">
              <SearchableSelect
                value={enrolProgramme}
                onChange={setEnrolProgramme}
                options={programmes
                  .filter((p) => !!p.id)
                  .map((p) => ({ value: p.id!, label: p.name }))}
                placeholder="Choose a programme"
                searchPlaceholder="Search programmes..."
              />
            </div>
            {enrolStages.length > 0 ? (
              <SearchableSelect
                value={enrolStage}
                onChange={setEnrolStage}
                options={enrolStages.map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Starting stage"
                searchPlaceholder="Search stages..."
              />
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
              <SearchableSelect
                value={stageId}
                onChange={setStageId}
                disabled={!stages.length}
                options={stages.map((stage) => ({ value: stage.id, label: stage.label }))}
                placeholder={stages.length ? "Choose stage" : "No stages defined"}
                searchPlaceholder="Search stages..."
              />
              <Button
                type="button"
                onClick={saveStage}
                disabled={pending || stageId === (beneficiary.stage_id ?? "")}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Moving to Approved / Deferred / Declined records the decision.
            </p>
            {!stages.length && beneficiary.programme_id ? (
              <p className="text-xs text-muted-foreground">
                Define stages on the programme first.
              </p>
            ) : null}
          </DetailSection>
        ) : null}

        {isLive && beneficiary.enrolment_id ? (
          <DetailSection title="Programme data">
            <EnrolmentFieldsSection enrolmentId={beneficiary.enrolment_id} />
          </DetailSection>
        ) : null}

        <DetailSection
          title={
            <span className="inline-flex items-center gap-2">
              Safeguarding
              <InfoTooltip
                content={
                  <ul className="space-y-1">
                    {safeguardingOptions.map((option) => (
                      <li key={option.value}>
                        <strong>{option.label}</strong>: {option.helper}
                      </li>
                    ))}
                  </ul>
                }
              />
            </span>
          }
        >
          <div className="flex gap-2">
            <SearchableSelect
              value={safeguarding}
              onChange={setSafeguarding}
              options={safeguardingOptions}
              placeholder="Choose safeguarding flag"
              searchPlaceholder="Search safeguarding..."
            />
            <Button
              type="button"
              onClick={saveSafeguarding}
              disabled={pending || safeguarding === (beneficiary.safeguarding_flag ?? "none")}
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {safeguardingOptions.find((o) => o.value === safeguarding)?.helper}
          </p>
          {safeguardingFeedback ? (
            <p
              className={cn(
                "text-xs",
                safeguardingFeedback.endsWith("updated.")
                  ? "text-emerald-700"
                  : "text-destructive",
              )}
            >
              {safeguardingFeedback}
            </p>
          ) : null}
        </DetailSection>

        <DetailSection title="Consent">
          {consentReceived ? (
            <>
              <div className="rounded-md border bg-emerald-50/60 p-3 space-y-1 text-sm">
                <p className="font-medium text-emerald-700">Consent received</p>
                {consentRecordedAt ? (
                  <p className="text-xs text-muted-foreground">
                    On {formatDate(consentRecordedAt)}
                  </p>
                ) : null}
                {consentDriveFileId ? (
                  <MediaPreview
                    driveFileId={consentDriveFileId}
                    label="Consent on file"
                    size="sm"
                    className="mt-1"
                  />
                ) : null}
              </div>
              {consentEnrolmentReady ? (
                <div className="space-y-2">
                  <Label className="text-xs">Replace file</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => setConsentFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || !consentFile}
                    onClick={uploadConsent}
                  >
                    Replace consent file
                  </Button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={clearConsent}
                disabled={pending}
                className="text-xs text-muted-foreground hover:text-destructive hover:underline"
              >
                Clear consent
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                No consent on file yet. Upload the signed form &mdash; that&apos;s what records it.
              </p>
              {consentEnrolmentReady ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => setConsentFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || !consentFile}
                    onClick={uploadConsent}
                  >
                    Upload consent
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enrol this beneficiary in a programme first — the consent file needs a
                  programme to anchor to in Drive.
                </p>
              )}
            </>
          )}
          {consentFeedback ? (
            <p
              className={cn(
                "text-xs",
                consentFeedback.endsWith("uploaded.") || consentFeedback.endsWith("cleared.")
                  ? "text-emerald-700"
                  : "text-destructive",
              )}
            >
              {consentFeedback}
            </p>
          ) : null}
        </DetailSection>

        {beneficiary.id ? (
          <BeneficiaryNotesSection
            beneficiaryId={beneficiary.id}
            enrolmentId={beneficiary.enrolment_id}
            programmeId={beneficiary.programme_id}
          />
        ) : null}

        {isLive ? (
          <DetailSection
            title={
              <span className="inline-flex items-center gap-2">
                Selection scorecard
                <InfoTooltip content="Each area contributes its weight to a 100-point total. Bands are guidance, not strict rules." />
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
              label="School academic record"
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
              label="CBT & exam-readiness"
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
            Stage and scorecard appear once this beneficiary is enrolled in a programme.
          </p>
        ) : null}

        {beneficiary.id ? (
          <DetailSection title="Danger zone">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Delete beneficiary</p>
                <p className="text-xs text-muted-foreground">
                  This permanently deletes the beneficiary profile and linked enrolments. Evidence
                  files stay in Drive, but their beneficiary link is cleared.
                </p>
              </div>
              {!deleteOpen ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Start delete
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                    Step 1: confirm you want a permanent delete. Step 2: type{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {beneficiary.beneficiary_code}
                    </span>{" "}
                    exactly. Step 3: tick the final confirmation.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Beneficiary code</Label>
                    <Input
                      value={deleteCode}
                      onChange={(event) => setDeleteCode(event.target.value)}
                      placeholder={beneficiary.beneficiary_code}
                      className="font-mono"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={deleteConfirmed}
                      onChange={(event) => setDeleteConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-input"
                    />
                    <span>
                      I understand this deletes the beneficiary profile and linked operational
                      records, and this cannot be undone from ImpactOps.
                    </span>
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteCode("");
                        setDeleteConfirmed(false);
                        setDeleteFeedback(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={deleteBeneficiary}
                      disabled={
                        pending ||
                        !deleteConfirmed ||
                        deleteCode.trim().toUpperCase() !== beneficiary.beneficiary_code.toUpperCase()
                      }
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete permanently
                    </Button>
                  </div>
                  {deleteFeedback ? (
                    <p
                      className={cn(
                        "text-xs",
                        deleteFeedback === "Beneficiary deleted."
                          ? "text-emerald-700"
                          : "text-destructive",
                      )}
                    >
                      {deleteFeedback}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </DetailSection>
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
      <p className="text-xs text-muted-foreground leading-snug">{rubric.helper}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: React.ReactNode;
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
