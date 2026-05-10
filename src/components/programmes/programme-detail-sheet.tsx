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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ProgrammeRow } from "@/lib/programmes";
import { programmeStatusOptions } from "@/lib/programme-config";
import {
  ProgrammeStatusBadge,
  programmeStatusBadgeClass,
} from "@/components/programmes/programme-status-badge";
import {
  addFundsEntryAction,
  addMilestoneAction,
  addStageAction,
  deleteMilestoneAction,
  deleteStageAction,
  listEnrolmentsByProgrammeAction,
  listFundsAction,
  listMilestonesAction,
  listStagesAction,
  moveStageAction,
  seedEducationStagesAction,
  toggleMilestoneAction,
  updateProgrammeStatusAction,
  type EnrolmentSummary,
  type FundsRow,
  type MilestoneRow,
  type StageRow,
} from "@/app/(protected)/programmes/actions";
import { cn } from "@/lib/utils";

export function ProgrammeDetailSheet({
  programme,
  open,
  onOpenChange,
}: {
  programme: ProgrammeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [loading, setLoading] = useState(false);
  const isMock = !programme?.id;

  useEffect(() => {
    if (!open || !programme?.id) return;
    setStatus(programme.status);
    setStatusFeedback(null);
    setMilestoneFeedback(null);
    setFundsFeedback(null);
    setStageFeedback(null);
    setLoading(true);
    Promise.all([
      listMilestonesAction(programme.id),
      listFundsAction(programme.id),
      listStagesAction(programme.id),
      listEnrolmentsByProgrammeAction(programme.id),
    ]).then(([m, f, s, e]) => {
      setMilestones(m);
      setFunds(f);
      setStages(s);
      setEnrolments(e);
      setLoading(false);
    });
  }, [open, programme?.id, programme?.status]);

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

  const fundsTotal = funds.reduce((sum, row) => sum + row.amount_ngn, 0);
  const milestoneProgress = milestones.length
    ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
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

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1">Milestones</TabsTrigger>
            <TabsTrigger value="funds" className="flex-1">Funds</TabsTrigger>
            <TabsTrigger value="pipeline" className="flex-1">Pipeline</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="flex-1">People</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5 pt-4">
            <DetailRow label="Type" value={programme.programme_type} />
            <DetailRow label="Donor / funder" value={programme.donor_funder || "—"} />
            <DetailRow label="Locations" value={programme.location_areas.join(", ") || "—"} />
            <DetailRow label="Dates" value={programme.timeline_label} />
            <DetailRow
              label="Expected beneficiaries"
              value={programme.expected_beneficiaries?.toLocaleString() ?? "—"}
            />
            <DetailRow
              label="Budget"
              value={programme.budget_ngn ? `NGN ${programme.budget_ngn.toLocaleString("en-NG")}` : "—"}
            />
            <DetailRow
              label="Raised so far"
              value={`NGN ${fundsTotal.toLocaleString("en-NG")}`}
            />
            {programme.budget_ngn && programme.budget_ngn > 0 ? (
              <ProgressBar
                value={Math.min(100, Math.round((fundsTotal / programme.budget_ngn) * 100))}
                tone="emerald"
                hint={`${Math.min(100, Math.round((fundsTotal / programme.budget_ngn) * 100))}% funded`}
              />
            ) : null}
            <ProgressBar
              value={milestoneProgress}
              tone="purple"
              hint={`${milestoneProgress}% milestones complete`}
            />

            {programme.flyer_drive_file_id ? (
              <a
                href={`https://drive.google.com/file/d/${programme.flyer_drive_file_id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View flyer <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="programme-status">Update status</Label>
              <div className="flex gap-2">
                <Select value={status} onValueChange={setStatus} disabled={isMock}>
                  <SelectTrigger id="programme-status" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programmeStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              programmeStatusBadgeClass(option.value).split(" ")[0].replace("bg-", "bg-"),
                            )}
                          />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={saveStatus}
                  disabled={isMock || statusPending || status === programme.status}
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
          </TabsContent>

          {/* MILESTONES */}
          <TabsContent value="milestones" className="space-y-4 pt-4">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <Input
                placeholder="Milestone title (e.g., Nominations close)"
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                disabled={isMock}
              />
              <Input
                type="date"
                value={milestoneDue}
                onChange={(event) => setMilestoneDue(event.target.value)}
                disabled={isMock}
              />
              <Button
                type="button"
                disabled={isMock || !milestoneTitle.trim()}
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
                      disabled={isMock}
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
                      disabled={isMock}
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

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">Add entry</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Amount (NGN)"
                  inputMode="decimal"
                  value={fundsAmount}
                  onChange={(event) => setFundsAmount(formatThousands(event.target.value))}
                  disabled={isMock}
                />
                <Input
                  placeholder="Source (e.g., Donor A)"
                  value={fundsSource}
                  onChange={(event) => setFundsSource(event.target.value)}
                  disabled={isMock}
                />
                <Input
                  type="date"
                  value={fundsDate}
                  onChange={(event) => setFundsDate(event.target.value)}
                  disabled={isMock}
                />
                <Input
                  placeholder="Note (optional)"
                  value={fundsNote}
                  onChange={(event) => setFundsNote(event.target.value)}
                  disabled={isMock}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={isMock || !fundsAmount.trim() || !fundsSource.trim()}
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
                  disabled={isMock}
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
            ) : null}

            <div className="flex gap-2">
              <Input
                placeholder="New stage label (e.g., Awaiting Documents)"
                value={newStage}
                onChange={(event) => setNewStage(event.target.value)}
                disabled={isMock}
              />
              <Button
                type="button"
                disabled={isMock || !newStage.trim()}
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
                      disabled={isMock || index === 0}
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
                      disabled={isMock || index === stages.length - 1}
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
                    disabled={isMock}
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
                No beneficiaries enrolled yet.
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
                      {row.scorecard_total !== null ? (
                        <Badge variant="outline" className="font-normal">
                          {row.scorecard_total}/100
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TabsContent>
        </Tabs>
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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
