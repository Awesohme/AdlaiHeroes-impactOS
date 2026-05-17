"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ProgrammeRow } from "@/lib/programmes";
import { programmeStatusOptions } from "@/lib/programme-config";
import { ProgrammeStatusBadge } from "@/components/programmes/programme-status-badge";
import {
  addFundsEntryAction,
  addMilestoneAction,
  addStageAction,
  deleteMilestoneAction,
  deleteStageAction,
  listEnrolmentsByProgrammeAction,
  listAvailableBeneficiariesForProgrammeAction,
  listFundsAction,
  listMilestonesAction,
  listProgrammeReachUpdatesAction,
  listStagesAction,
  moveStageAction,
  seedEducationStagesAction,
  toggleMilestoneAction,
  updateManualReachAction,
  updateProgrammeStatusAction,
  type BeneficiaryOption,
  type EnrolmentSummary,
  type FundsRow,
  type MilestoneRow,
  type ReachUpdateRow,
  type StageRow,
} from "@/app/(protected)/programmes/actions";
import { cn } from "@/lib/utils";
import { MediaPreview } from "@/components/media-preview";
import { SearchableSelect } from "@/components/searchable-select";
import { enrolBeneficiaryAction } from "@/app/(protected)/beneficiaries/actions";
import { usesEducationScorecard } from "@/lib/programme-pipeline";
import { ProgrammeNotesPanel } from "@/components/programmes/programme-notes-panel";
import { ProgrammeReportingPanel } from "@/components/programmes/programme-reporting-panel";

export function ProgrammeDetailSheet({
  programme,
  open,
  onOpenChange,
  canManageOps = false,
}: {
  programme: ProgrammeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageOps?: boolean;
}) {
  const [status, setStatus] = useState(programme?.status ?? "draft");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [statusPending, startStatusTransition] = useTransition();

  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");
  const [milestoneFeedback, setMilestoneFeedback] = useState<string | null>(null);

  const [funds, setFunds] = useState<FundsRow[]>([]);
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsSource, setFundsSource] = useState("");
  const [fundsDate, setFundsDate] = useState(today());
  const [fundsNote, setFundsNote] = useState("");
  const [fundsFeedback, setFundsFeedback] = useState<string | null>(null);

  const [stages, setStages] = useState<StageRow[]>([]);
  const [newStage, setNewStage] = useState("");
  const [stageFeedback, setStageFeedback] = useState<string | null>(null);

  const [enrolments, setEnrolments] = useState<EnrolmentSummary[]>([]);
  const [availableBeneficiaries, setAvailableBeneficiaries] = useState<BeneficiaryOption[]>([]);
  const [beneficiaryToEnrol, setBeneficiaryToEnrol] = useState("");
  const [startingStage, setStartingStage] = useState("");
  const [enrolFeedback, setEnrolFeedback] = useState<string | null>(null);
  const [reachUpdates, setReachUpdates] = useState<ReachUpdateRow[]>([]);
  const [manualActualCount, setManualActualCount] = useState<number | null>(
    programme?.actual_reach_count ?? null,
  );
  const [reachModalOpen, setReachModalOpen] = useState(false);
  const [reachCountInput, setReachCountInput] = useState("");
  const [reachNote, setReachNote] = useState("");
  const [reachFeedback, setReachFeedback] = useState<string | null>(null);
  const [reachPending, startReachTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const isMock = !programme?.id;

  useEffect(() => {
    if (!open || !programme?.id) return;
    setStatus(programme.status);
    setStatusFeedback(null);
    setMilestoneFeedback(null);
    setFundsFeedback(null);
    setStageFeedback(null);
    setEnrolFeedback(null);
    setReachFeedback(null);
    setReachModalOpen(false);
    setReachNote("");
    setReachCountInput("");
    setManualActualCount(programme.actual_reach_count ?? null);
    setBeneficiaryToEnrol("");
    setStartingStage("");
    setLoading(true);
    Promise.all([
      listMilestonesAction(programme.id),
      listFundsAction(programme.id),
      listStagesAction(programme.id),
      listEnrolmentsByProgrammeAction(programme.id),
      !programme.archived_at
        ? listAvailableBeneficiariesForProgrammeAction(programme.id)
        : Promise.resolve([]),
      programme.reach_tracking_mode === "manual"
        ? listProgrammeReachUpdatesAction(programme.id)
        : Promise.resolve([]),
    ]).then(([m, f, s, e, available, r]) => {
      setMilestones(m);
      setFunds(f);
      setStages(s);
      setEnrolments(e);
      setAvailableBeneficiaries(available);
      setReachUpdates(r);
      setLoading(false);
    });
  }, [
    open,
    programme?.id,
    programme?.status,
    programme?.actual_reach_count,
    programme?.reach_tracking_mode,
    programme?.archived_at,
  ]);

  if (!programme) return null;

  function saveStatus() {
    if (!programme?.id || status === programme.status) return;
    setStatusFeedback(null);
    startStatusTransition(async () => {
      const result = await updateProgrammeStatusAction(programme.id!, status);
      if (result.ok) setStatusFeedback("Status updated.");
      else setStatusFeedback(result.error);
    });
  }

  function saveManualReach() {
    if (!programme?.id || !canQuickUpdateManualReach) return;
    setReachFeedback(null);
    startReachTransition(async () => {
      const result = await updateManualReachAction(programme.id!, {
        actualCount: reachCountInput,
        note: reachNote,
      });
      if (!result.ok) {
        setReachFeedback(result.error);
        return;
      }
      if (!result.data) {
        setReachFeedback("The actual count was updated, but the latest summary could not be loaded.");
        return;
      }
      setManualActualCount(result.data.actualCount);
      setReachUpdates(result.data.updates);
      setReachModalOpen(false);
      setReachCountInput("");
      setReachNote("");
      setReachFeedback(null);
    });
  }

  const fundsTotal = funds.reduce((sum, row) => sum + row.amount_ngn, 0);
  const fundsRemaining = Math.max((programme.budget_ngn ?? 0) - fundsTotal, 0);
  const actualReachCount =
    programme.reach_tracking_mode === "manual"
      ? manualActualCount
      : programme.actual_reach_count;
  const reachGap =
    programme.target_reach_count !== null && actualReachCount !== null
      ? programme.target_reach_count - actualReachCount
      : null;
  const isArchived = Boolean(programme.archived_at);
  const canQuickUpdateManualReach =
    programme.reach_tracking_mode === "manual" && !isArchived && !isMock && canManageOps;
  const scorecardEnabled = usesEducationScorecard(programme.pipeline_template_key);
  const enrolmentOptions = availableBeneficiaries.map((row) => ({
    value: row.id,
    label: `${row.full_name} (${row.beneficiary_code})`,
  }));
  const milestoneProgress = milestones.length
    ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg">{programme.name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {programme.programme_code}
              </SheetDescription>
            </div>
            <ProgrammeStatusBadge status={programme.status} />
          </div>
        </SheetHeader>

        {isArchived ? (
          <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Archived programme</p>
            <p className="mt-1 text-muted-foreground">
              {programme.archive_reason || "No archive reason recorded."}
            </p>
            {programme.archived_at ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Archived {formatDate(programme.archived_at)}
              </p>
            ) : null}
          </div>
        ) : null}

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full overflow-x-auto whitespace-nowrap justify-start sm:justify-stretch">
            <TabsTrigger value="overview" className="flex-1 min-w-fit">Overview</TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1 min-w-fit">Milestones</TabsTrigger>
            <TabsTrigger value="funds" className="flex-1 min-w-fit">Funds</TabsTrigger>
            <TabsTrigger value="pipeline" className="flex-1 min-w-fit">Pipeline</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="flex-1 min-w-fit">People</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 min-w-fit">Notes</TabsTrigger>
            <TabsTrigger value="reporting" className="flex-1 min-w-fit">Reporting</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5 pt-4">
            <DetailRow label="Type" value={programme.programme_type} />
            <DetailRow label="Donor / funder" value={programme.donor_funder || "—"} />
            <DetailRow label="Locations" value={programme.location_areas.join(", ") || "—"} />
            <DetailRow label="Dates" value={programme.timeline_label} />
            <DetailRow
              label="Reach tracking"
              value={
                programme.reach_tracking_mode === "manual"
                  ? "Manual count"
                  : "Beneficiary registry"
              }
            />
            <DetailRow
              label={`Target ${programme.reach_unit_label}`}
              value={formatReachCount(programme.target_reach_count, programme.reach_unit_label)}
            />
            <DetailRow
              label={`Actual ${programme.reach_unit_label}`}
              value={formatReachCount(actualReachCount, programme.reach_unit_label)}
            />
            {reachGap !== null ? (
              <DetailRow
                label={reachGap >= 0 ? "Remaining gap" : "Over target"}
                value={formatReachCount(Math.abs(reachGap), programme.reach_unit_label)}
              />
            ) : null}
            {programme.reach_tracking_mode === "manual" ? (
              <DetailRow
                label="Actual source"
                value="Manual operational count"
              />
            ) : (
              <DetailRow
                label="Actual source"
                value="Derived from enrolled beneficiaries"
              />
            )}
            {programme.reach_tracking_mode === "beneficiary_registry" ? (
              <DetailRow
                label="Registry records"
                value={formatReachCount(enrolments.length, "records")}
              />
            ) : null}
            <DetailRow
              label="Budget"
              value={programme.budget_ngn ? `NGN ${programme.budget_ngn.toLocaleString("en-NG")}` : "—"}
            />
            <DetailRow
              label="Raised so far"
              value={`NGN ${fundsTotal.toLocaleString("en-NG")}`}
            />
            {programme.budget_ngn ? (
              <DetailRow
                label="Amount left"
                value={`NGN ${fundsRemaining.toLocaleString("en-NG")}`}
              />
            ) : null}
            {programme.budget_ngn && programme.budget_ngn > 0 ? (
              (() => {
                const rawPercent = Math.min(100, (fundsTotal / programme.budget_ngn) * 100);
                const barWidth = fundsTotal > 0 ? Math.max(2, rawPercent) : 0;
                const label = `NGN ${fundsTotal.toLocaleString("en-NG")} of NGN ${programme.budget_ngn.toLocaleString("en-NG")} (${formatPercentDrawer(rawPercent)})`;
                return <ProgressBar value={barWidth} tone="emerald" hint={label} />;
              })()
            ) : null}
            <ProgressBar
              value={milestoneProgress}
              tone="purple"
              hint={`${milestoneProgress}% milestones complete`}
            />

            {programme.flyer_drive_file_id ? (
              <MediaPreview
                driveFileId={programme.flyer_drive_file_id}
                label="Flyer"
              />
            ) : null}

            {canQuickUpdateManualReach ? (
              <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Manual reach updates</p>
                    <p className="text-xs text-muted-foreground">
                      Record the latest actual {programme.reach_unit_label} count without opening the full editor.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setReachFeedback(null);
                      setReachCountInput(actualReachCount?.toString() ?? "");
                      setReachNote("");
                      setReachModalOpen(true);
                    }}
                  >
                    Update actual count
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recent updates
                  </p>
                  {reachUpdates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No manual updates recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {reachUpdates.slice(0, 5).map((update) => (
                        <li key={update.id} className="rounded-md border bg-background px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="font-medium">
                              {formatReachTransition(
                                update.previous_actual_count,
                                update.new_actual_count,
                                programme.reach_unit_label,
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(update.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {update.created_by_name || update.created_by_email || "Unknown teammate"}
                          </p>
                          {update.note ? (
                            <p className="mt-1 text-xs text-muted-foreground">{update.note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="programme-status">Update status</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={status}
                  onChange={setStatus}
                  disabled={isMock || isArchived}
                  options={programmeStatusOptions}
                  placeholder="Choose status"
                  searchPlaceholder="Search statuses..."
                />
                <Button
                  type="button"
                  onClick={saveStatus}
                  disabled={isMock || isArchived || statusPending || status === programme.status}
                >
                  {statusPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              {statusFeedback ? (
                <p
                  className={cn(
                    "text-xs",
                    statusFeedback === "Status updated." ? "text-emerald-700" : "text-destructive",
                  )}
                >
                  {statusFeedback}
                </p>
              ) : null}
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href={`/programmes/${programme.programme_code}/edit`} prefetch={false}>
                Open full editor
              </Link>
            </Button>

            {isArchived ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Archived. Restore from the full editor.
              </div>
            ) : null}
          </TabsContent>

          {/* MILESTONES */}
          <TabsContent value="milestones" className="space-y-4 pt-4">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <Input
                placeholder="Milestone title (e.g., Nominations close)"
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                disabled={isMock || isArchived}
              />
              <Input
                type="date"
                value={milestoneDue}
                onChange={(event) => setMilestoneDue(event.target.value)}
                disabled={isMock || isArchived}
              />
              <Button
                type="button"
                disabled={isMock || isArchived || !milestoneTitle.trim()}
                onClick={() => {
                  if (!programme?.id) return;
                  setMilestoneFeedback(null);
                  addMilestoneAction(programme.id, milestoneTitle, milestoneDue || null).then(
                    (result) => {
                      if (result.ok) {
                        setMilestones(result.data ?? []);
                        setMilestoneTitle("");
                        setMilestoneDue("");
                      } else {
                        setMilestoneFeedback(result.error);
                      }
                    },
                  );
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {milestoneFeedback ? (
              <p className="text-xs text-destructive">{milestoneFeedback}</p>
            ) : null}

            <ProgressBar
              value={milestoneProgress}
              tone="purple"
              hint={`${milestones.filter((m) => m.done).length} of ${milestones.length} complete`}
            />

            <ul className="space-y-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No milestones yet — add the first one above.
                </p>
              ) : (
                milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={milestone.done}
                      disabled={isMock || isArchived}
                      onChange={(event) => {
                        if (!programme?.id) return;
                        toggleMilestoneAction(programme.id, milestone.id, event.target.checked).then(
                          (result) => {
                            if (result.ok) setMilestones(result.data ?? []);
                          },
                        );
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          milestone.done && "text-muted-foreground line-through",
                        )}
                      >
                        {milestone.title}
                      </p>
                      {milestone.due_date ? (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(milestone.due_date)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isMock || isArchived}
                      onClick={() => {
                        if (!programme?.id) return;
                        deleteMilestoneAction(programme.id, milestone.id).then((result) => {
                          if (result.ok) setMilestones(result.data ?? []);
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </TabsContent>

          {/* FUNDS */}
          <TabsContent value="funds" className="space-y-4 pt-4">
            <div className="rounded-md border bg-muted/30 p-3 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Total raised
              </span>
              <span className="text-2xl font-semibold">
                NGN {fundsTotal.toLocaleString("en-NG")}
              </span>
            </div>
            {programme.budget_ngn ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Budget</p>
                  <p className="text-lg font-semibold">NGN {programme.budget_ngn.toLocaleString("en-NG")}</p>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount left</p>
                  <p className="text-lg font-semibold">NGN {fundsRemaining.toLocaleString("en-NG")}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">Add entry</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Amount (NGN)"
                  inputMode="decimal"
                  value={fundsAmount}
                  onChange={(event) => setFundsAmount(formatThousands(event.target.value))}
                  disabled={isMock || isArchived}
                />
                <Input
                  placeholder="Source (e.g., Donor A)"
                  value={fundsSource}
                  onChange={(event) => setFundsSource(event.target.value)}
                  disabled={isMock || isArchived}
                />
                <Input
                  type="date"
                  value={fundsDate}
                  onChange={(event) => setFundsDate(event.target.value)}
                  disabled={isMock || isArchived}
                />
                <Input
                  placeholder="Note (optional)"
                  value={fundsNote}
                  onChange={(event) => setFundsNote(event.target.value)}
                  disabled={isMock || isArchived}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={isMock || isArchived || !fundsAmount.trim() || !fundsSource.trim()}
                  onClick={() => {
                    if (!programme?.id) return;
                    setFundsFeedback(null);
                    addFundsEntryAction(programme.id, {
                      amount: fundsAmount,
                      source: fundsSource,
                      contributedOn: fundsDate,
                      note: fundsNote || undefined,
                    }).then((result) => {
                      if (result.ok) {
                        setFunds(result.data ?? []);
                        setFundsAmount("");
                        setFundsSource("");
                        setFundsNote("");
                      } else {
                        setFundsFeedback(result.error);
                      }
                    });
                  }}
                >
                  <Plus className="h-4 w-4" /> Record entry
                </Button>
              </div>
              {fundsFeedback ? (
                <p className="text-xs text-destructive">{fundsFeedback}</p>
              ) : null}
            </div>

            <ul className="space-y-2">
              {funds.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No funding recorded yet.
                </p>
              ) : (
                funds.map((row) => (
                  <li key={row.id} className="rounded-md border p-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        NGN {row.amount_ngn.toLocaleString("en-NG")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(row.contributed_on)}
                      </span>
                    </div>
                    <p className="text-sm">{row.source}</p>
                    {row.note ? (
                      <p className="text-xs text-muted-foreground">{row.note}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </TabsContent>

          {/* PIPELINE */}
          <TabsContent value="pipeline" className="space-y-4 pt-4">
            {stages.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No pipeline stages yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMock || isArchived}
                  onClick={() => {
                    if (!programme?.id) return;
                    seedEducationStagesAction(programme.id).then((result) => {
                      if (result.ok) setStages(result.data ?? []);
                      else setStageFeedback(result.error);
                    });
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Use Education Sponsorship template
                </Button>
              </div>
            ) : enrolments.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                {programme.reach_tracking_mode === "manual"
                  ? "This programme tracks reach manually, so pipeline stages are optional. Use them only if this team still wants a beneficiary workflow."
                  : "Stages move beneficiaries through milestones once they&apos;re enrolled here. Open a beneficiary → \"Enrol in a programme\" to start."}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Input
                placeholder="New stage label (e.g., Awaiting Documents)"
                value={newStage}
                onChange={(event) => setNewStage(event.target.value)}
                disabled={isMock || isArchived}
              />
              <Button
                type="button"
                disabled={isMock || isArchived || !newStage.trim()}
                onClick={() => {
                  if (!programme?.id) return;
                  setStageFeedback(null);
                  addStageAction(programme.id, newStage).then((result) => {
                    if (result.ok) {
                      setStages(result.data ?? []);
                      setNewStage("");
                    } else {
                      setStageFeedback(result.error);
                    }
                  });
                }}
              >
                <Plus className="h-4 w-4" /> Add stage
              </Button>
            </div>
            {stageFeedback ? <p className="text-xs text-destructive">{stageFeedback}</p> : null}

            <ul className="space-y-2">
              {stages.map((stage, index) => (
                <li
                  key={stage.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={isMock || isArchived || index === 0}
                      onClick={() => {
                        if (!programme?.id) return;
                        moveStageAction(programme.id, stage.id, -1).then((result) => {
                          if (result.ok) setStages(result.data ?? []);
                        });
                      }}
                      className="rounded p-0.5 disabled:opacity-30 hover:bg-muted"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isMock || isArchived || index === stages.length - 1}
                      onClick={() => {
                        if (!programme?.id) return;
                        moveStageAction(programme.id, stage.id, 1).then((result) => {
                          if (result.ok) setStages(result.data ?? []);
                        });
                      }}
                      className="rounded p-0.5 disabled:opacity-30 hover:bg-muted"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{stage.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{stage.key}</p>
                  </div>
                  {stage.is_terminal ? (
                    <Badge variant="outline" className="font-normal text-xs">
                      Terminal
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isMock || isArchived}
                    onClick={() => {
                      if (!programme?.id) return;
                      deleteStageAction(programme.id, stage.id).then((result) => {
                        if (result.ok) setStages(result.data ?? []);
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </TabsContent>

          {/* BENEFICIARIES */}
          <TabsContent value="beneficiaries" className="space-y-3 pt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : enrolments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {programme.reach_tracking_mode === "manual"
                  ? "No beneficiaries are linked yet. That is fine for manual-reach programmes."
                  : "No beneficiaries enrolled yet."}
              </p>
            ) : (
              <>
                <StageDistribution stages={stages} enrolments={enrolments} />
                <ul className="space-y-2">
                  {enrolments.map((row) => (
                    <li
                      key={row.enrolment_id}
                      className="rounded-md border p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{row.beneficiary_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.beneficiary_code}
                        </p>
                      </div>
                      {row.stage_label ? (
                        <Badge variant="secondary" className="font-normal">
                          {row.stage_label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not staged</span>
                      )}
                      {scorecardEnabled && row.scorecard_total !== null ? (
                        <Badge variant="outline" className="font-normal">
                          {row.scorecard_total}/100
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!isMock && !isArchived ? (
              <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                <div>
                  <p className="text-sm font-medium">Add beneficiary to this programme</p>
                  <p className="text-xs text-muted-foreground">
                    Pick an existing beneficiary, then choose their starting stage.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
                  <SearchableSelect
                    value={beneficiaryToEnrol}
                    onChange={setBeneficiaryToEnrol}
                    options={enrolmentOptions}
                    placeholder="Choose beneficiary"
                    searchPlaceholder="Search beneficiaries..."
                    emptyText="No available beneficiaries found."
                  />
                  <SearchableSelect
                    value={startingStage}
                    onChange={setStartingStage}
                    options={[
                      { value: "_none", label: "No stage" },
                      ...stages.map((stage) => ({ value: stage.id, label: stage.label })),
                    ]}
                    placeholder="Starting stage"
                    searchPlaceholder="Search stages..."
                  />
                  <Button
                    type="button"
                    disabled={!beneficiaryToEnrol}
                    onClick={() => {
                      if (!programme?.id || !beneficiaryToEnrol) return;
                      setEnrolFeedback(null);
                      enrolBeneficiaryAction(
                        beneficiaryToEnrol,
                        programme.id,
                        startingStage && startingStage !== "_none" ? startingStage : null,
                      ).then((result) => {
                        if (result.ok) {
                          setBeneficiaryToEnrol("");
                          setStartingStage("");
                          Promise.all([
                            listEnrolmentsByProgrammeAction(programme.id!),
                            listStagesAction(programme.id!),
                            listAvailableBeneficiariesForProgrammeAction(programme.id!),
                          ]).then(([nextEnrolments, nextStages, nextAvailableBeneficiaries]) => {
                            setEnrolments(nextEnrolments);
                            setStages(nextStages);
                            setAvailableBeneficiaries(nextAvailableBeneficiaries);
                          });
                          setEnrolFeedback("Beneficiary enrolled.");
                        } else {
                          setEnrolFeedback(result.error);
                        }
                      });
                    }}
                  >
                    Enrol
                  </Button>
                </div>
                {enrolFeedback ? (
                  <p
                    className={cn(
                      "text-xs",
                      enrolFeedback === "Beneficiary enrolled."
                        ? "text-emerald-700"
                        : "text-destructive",
                    )}
                  >
                    {enrolFeedback}
                  </p>
                ) : null}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="notes" className="pt-4">
            {!isMock ? (
              <ProgrammeNotesPanel
                programmeId={programme.id!}
                canManageOps={canManageOps && !isArchived}
              />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Programme notes are available once this programme is saved to the live workspace.
              </div>
            )}
          </TabsContent>

          <TabsContent value="reporting" className="pt-4">
            {!isMock ? (
              <ProgrammeReportingPanel
                programmeId={programme.id!}
                programmeName={programme.name}
                programmeCode={programme.programme_code}
                programmeStatus={programme.status}
                programmeStartDate={programme.start_date}
                programmeEndDate={programme.end_date}
                donorFunder={programme.donor_funder}
                canManageOps={canManageOps && !isArchived}
              />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Reporting tools are available once this programme is saved to the live workspace.
              </div>
            )}
          </TabsContent>
        </Tabs>

        {reachModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Update actual count</h3>
                <p className="text-sm text-muted-foreground">
                  Record the latest actual {programme.reach_unit_label} for this manual-reach programme.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Target</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatReachCount(programme.target_reach_count, programme.reach_unit_label)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatReachCount(actualReachCount, programme.reach_unit_label)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Unit</p>
                    <p className="mt-1 text-sm font-medium capitalize">{programme.reach_unit_label}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-reach-count">New actual count</Label>
                  <Input
                    id="manual-reach-count"
                    inputMode="numeric"
                    placeholder="Enter the latest total"
                    value={reachCountInput}
                    onChange={(event) => setReachCountInput(event.target.value.replace(/[^\d]/g, ""))}
                    disabled={reachPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-reach-note">Reason / note (optional)</Label>
                  <Input
                    id="manual-reach-note"
                    placeholder="Example: field count from Lagos outreach"
                    value={reachNote}
                    onChange={(event) => setReachNote(event.target.value)}
                    disabled={reachPending}
                  />
                </div>

                {reachFeedback ? (
                  <p className="text-xs text-destructive">{reachFeedback}</p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (reachPending) return;
                      setReachModalOpen(false);
                    }}
                    disabled={reachPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveManualReach}
                    disabled={reachPending || !reachCountInput.trim()}
                  >
                    {reachPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save update"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function StageDistribution({
  stages,
  enrolments,
}: {
  stages: StageRow[];
  enrolments: EnrolmentSummary[];
}) {
  const counts = stages.map((stage) => ({
    label: stage.label,
    count: enrolments.filter((e) => e.stage_id === stage.id).length,
  }));
  const unstaged = enrolments.filter((e) => !e.stage_id).length;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {counts.map((c) => (
        <div key={c.label} className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex justify-between">
          <span className="text-muted-foreground">{c.label}</span>
          <span className="font-semibold">{c.count}</span>
        </div>
      ))}
      {unstaged ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex justify-between">
          <span className="text-muted-foreground">Unstaged</span>
          <span className="font-semibold">{unstaged}</span>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function formatReachCount(value: number | null, unitLabel: string) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("en-NG")} ${unitLabel}`;
}

function ProgressBar({
  value,
  tone,
  hint,
}: {
  value: number;
  tone: "purple" | "emerald";
  hint: string;
}) {
  const barColor = tone === "purple" ? "bg-purple-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full", barColor)} style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function formatPercentDrawer(value: number) {
  if (value === 0) return "0%";
  if (value < 0.1) return "<0.1%";
  if (value < 1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatReachTransition(
  previousValue: number | null,
  nextValue: number,
  unitLabel: string,
) {
  const previousLabel =
    previousValue === null || previousValue === undefined
      ? "Not set"
      : `${previousValue.toLocaleString("en-NG")} ${unitLabel}`;
  return `${previousLabel} → ${nextValue.toLocaleString("en-NG")} ${unitLabel}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatThousands(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

export { CheckCircle2 };
