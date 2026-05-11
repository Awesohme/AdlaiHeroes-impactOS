import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBeneficiaries, isEnrolmentActive } from "@/lib/beneficiaries";
import { getEvidenceRecords } from "@/lib/evidence";
import { getProgrammes } from "@/lib/programmes";
import { getDashboardSignals } from "@/lib/dashboard";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FilePlus,
  FolderKanban,
  FolderPlus,
  GitPullRequest,
  Users,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { MetricTile, type MetricTone } from "@/components/metric-tile";
import { InfoTooltip } from "@/components/info-tooltip";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const programmes = await getProgrammes();
  const evidence = await getEvidenceRecords();
  const beneficiaries = await getBeneficiaries(programmes.rows);
  const signals = await getDashboardSignals();

  const counters: Array<{
    label: string;
    value: number;
    detail: string;
    tone: MetricTone;
    icon: LucideIcon;
  }> = [
    {
      label: "Programmes",
      value: programmes.rows.length,
      detail: `${programmes.rows.filter((item) => item.status === "active").length} active`,
      tone: "purple",
      icon: FolderKanban,
    },
    {
      label: "Beneficiaries",
      value: beneficiaries.rows.length,
      detail: `${beneficiaries.rows.filter(isEnrolmentActive).length} active`,
      tone: "teal",
      icon: Users,
    },
    {
      label: "Evidence",
      value: evidence.rows.length,
      detail: `${evidence.rows.filter((item) => item.status === "Confirmed").length} confirmed`,
      tone: "blue",
      icon: FileCheck2,
    },
    {
      label: "Needs attention",
      value:
        beneficiaries.rows.filter((item) => item.risk_flag === "review").length +
        evidence.rows.filter((item) => item.status !== "Confirmed").length,
      detail: "Review and follow-up",
      tone: "amber",
      icon: AlertCircle,
    },
  ];

  const attentionRows = [
    ...beneficiaries.rows
      .filter((item) => item.risk_flag === "review")
      .slice(0, 3)
      .map((item) => ({
        label: item.full_name,
        meta: `${item.programme_name} • ${formatLabel(item.current_status)}`,
        action: item.safeguarding_flag === "none" ? "Review record" : "Safeguarding follow-up",
      })),
    ...evidence.rows
      .filter((item) => item.status !== "Confirmed")
      .slice(0, 3)
      .map((item) => ({
        label: item.title,
        meta: `${item.linkedRecord} • ${item.status}`,
        action: item.blocker,
      })),
  ].slice(0, 5);

  const recentRecords = [
    ...programmes.rows.slice(0, 2).map((item) => ({
      type: "Programme",
      title: item.name,
      detail: `${item.programme_code} • ${formatLabel(item.status)}`,
    })),
    ...beneficiaries.rows.slice(0, 2).map((item) => ({
      type: "Beneficiary",
      title: item.full_name,
      detail: `${item.beneficiary_code} • ${item.programme_name}`,
    })),
    ...evidence.rows.slice(0, 2).map((item) => ({
      type: "Evidence",
      title: item.title,
      detail: `${item.code} • ${item.status}`,
    })),
  ].slice(0, 6);

  return (
    <AppFrame
      eyebrow="Overview"
      title="Dashboard"
      description="A light launchpad into programmes, beneficiaries, and evidence."
      action={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/beneficiaries" prefetch={false}>
              <UserPlus className="h-4 w-4" /> Beneficiary
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/programmes/new" prefetch={false}>
              <FolderPlus className="h-4 w-4" /> New programme
            </Link>
          </Button>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((stat) => (
          <MetricTile key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-blue-50/60">
          <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" aria-hidden="true" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              Approvals pending
              <InfoTooltip content="Enrolments in Nominated or Validated stages awaiting Adlai readiness validation." />
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <GitPullRequest className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{signals.approvalsPending}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Awaiting decision after validation
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-amber-50/60">
          <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" aria-hidden="true" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              Milestones (7 days)
              <InfoTooltip content="Open milestones across all programmes due within the next 7 days." />
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <CalendarClock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{signals.upcomingMilestones}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {signals.upcomingMilestoneProgrammes} programme(s) affected
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-purple-50/60">
          <span className="absolute inset-y-0 left-0 w-1 bg-purple-500" aria-hidden="true" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              Pipeline distribution
              <InfoTooltip content="Beneficiaries grouped by their current pipeline stage across all programmes (top 5)." />
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {signals.pipelineDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No enrolments yet — pipeline fills as beneficiaries get enrolled.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {signals.pipelineDistribution.map((row) => (
                  <li key={row.label} className="flex items-center justify-between">
                    <span className="truncate">{row.label}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Needs attention</CardTitle>
            <Link
              href="/evidence"
              prefetch={false}
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Open evidence <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y">
            {attentionRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No urgent blockers right now.
              </p>
            ) : (
              attentionRows.map((item) => (
                <div
                  key={`${item.label}-${item.meta}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.meta}</p>
                  </div>
                  <Badge variant="secondary" className="font-normal">
                    {item.action}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <QuickAction
              href="/programmes/new"
              icon={<FolderPlus className="h-4 w-4" />}
              title="Create programme"
              subtitle="Start a new operational record"
            />
            <QuickAction
              href="/beneficiaries"
              icon={<UserPlus className="h-4 w-4" />}
              title="Open beneficiaries"
              subtitle="Search and review people records"
            />
            <QuickAction
              href="/evidence/new"
              icon={<FilePlus className="h-4 w-4" />}
              title="Upload evidence"
              subtitle="Send a file to Drive"
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent records</CardTitle>
          <Link
            href="/programmes"
            prefetch={false}
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Open programmes <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="divide-y">
          {recentRecords.map((item) => (
            <div
              key={`${item.type}-${item.title}`}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="outline" className="font-normal shrink-0">
                  {item.type}
                </Badge>
                <p className="text-sm font-medium truncate">{item.title}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppFrame>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-start gap-3 rounded-md border p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
