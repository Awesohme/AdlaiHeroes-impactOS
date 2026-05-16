"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProgrammeArchiveScope, ProgrammeRow } from "@/lib/programmes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricTile, type MetricTone } from "@/components/metric-tile";
import { FolderKanban, Activity, ClipboardList, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProgrammeStatusBadge } from "@/components/programmes/programme-status-badge";
import { ProgrammeDetailSheet } from "@/components/programmes/programme-detail-sheet";
import { SearchableSelect } from "@/components/searchable-select";

export function ProgrammesOverview({
  rows,
  source,
  error,
  notice,
  archiveScope,
  canManageOps = false,
}: {
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
  notice?: string;
  archiveScope: ProgrammeArchiveScope;
  canManageOps?: boolean;
}) {
  const [yearFilter, setYearFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [donorFilter, setDonorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ProgrammeRow | null>(null);

  const filteredRows = rows.filter((row) => {
    const locationAreas = Array.isArray(row.location_areas) ? row.location_areas : [];
    const yearMatch =
      yearFilter === "all" ||
      row.start_date?.startsWith(yearFilter) ||
      row.end_date?.startsWith(yearFilter);
    const locationMatch = locationFilter === "all" || locationAreas.includes(locationFilter);
    const donorMatch = donorFilter === "all" || row.donor_funder === donorFilter;
    const typeMatch = typeFilter === "all" || row.programme_type === typeFilter;
    const statusMatch = statusFilter === "all" || row.status === statusFilter;
    return yearMatch && locationMatch && donorMatch && typeMatch && statusMatch;
  });

  const totals = {
    active: rows.filter((row) => row.status === "active").length,
    planned: rows.filter((row) => row.status === "planned" || row.status === "draft").length,
    atRisk: rows.filter((row) => row.status === "at_risk").length,
  };

  const years = uniqueValues(
    rows
      .flatMap((row) => [row.start_date?.slice(0, 4), row.end_date?.slice(0, 4)])
      .filter(Boolean) as string[],
  );
  const locations = uniqueValues(rows.flatMap((row) => (Array.isArray(row.location_areas) ? row.location_areas : [])));
  const donors = uniqueValues(rows.map((row) => row.donor_funder).filter(Boolean));
  const types = uniqueValues(rows.map((row) => row.programme_type));

  const counters: Array<{
    label: string;
    value: number;
    detail: string;
    tone: MetricTone;
    icon: LucideIcon;
  }> = [
    {
      label: "Total",
      value: rows.length,
      detail: "Saved records",
      tone: "purple",
      icon: FolderKanban,
    },
    {
      label: "Active",
      value: totals.active,
      detail: rows.length ? `${pct(totals.active, rows.length)}%` : "—",
      tone: "teal",
      icon: Activity,
    },
    {
      label: "Planning",
      value: totals.planned,
      detail: rows.length ? `${pct(totals.planned, rows.length)}%` : "—",
      tone: "blue",
      icon: ClipboardList,
    },
    {
      label: "At risk",
      value: totals.atRisk,
      detail: "Flagged",
      tone: "red",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      {source === "mock" ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error ?? "Showing fallback data — connect Supabase to go live."}</span>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((stat) => (
          <MetricTile key={stat.label} {...stat} />
        ))}
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Year"
              value={yearFilter}
              onChange={setYearFilter}
              options={years}
            />
            <FilterSelect
              label="State"
              value={locationFilter}
              onChange={setLocationFilter}
              options={locations}
            />
            <FilterSelect
              label="Donor"
              value={donorFilter}
              onChange={setDonorFilter}
              options={donors}
            />
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={types}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["draft", "planned", "active", "monitoring", "completed", "at_risk"]}
              formatter={formatStatus}
            />
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
              {(["active", "archived", "all"] as const).map((scope) => (
                <Button
                  key={scope}
                  asChild
                  size="sm"
                  variant={archiveScope === scope ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                >
                  <Link href={scope === "active" ? "/programmes" : `/programmes?view=${scope}`} prefetch={false}>
                    {formatStatus(scope)}
                  </Link>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setYearFilter("all");
                setLocationFilter("all");
                setDonorFilter("all");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredRows.length} of {rows.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                    No programmes match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.programme_code}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{row.programme_code}</span>
                        {row.archived_at ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5">Archived</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.programme_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <LocationsCell areas={row.location_areas} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatCompactTimeline(row.start_date, row.end_date)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatReachCount(row.target_reach_count, row.reach_unit_label)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div>{formatReachCount(row.actual_reach_count, row.reach_unit_label)}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.actual_reach_source === "manual" ? "Manual" : "Registry"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm min-w-[160px]">
                      <BudgetCell budget={row.budget_ngn} raised={row.funds_raised} />
                    </TableCell>
                    <TableCell>
                      <ProgrammeStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Link
                        href={`/programmes/${row.programme_code}/edit`}
                        prefetch={false}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Edit <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProgrammeDetailSheet
        programme={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canManageOps={canManageOps}
      />
    </div>
  );
}

function BudgetCell({ budget, raised }: { budget: number | null; raised: number }) {
  if (!budget) {
    return <span>—</span>;
  }
  const percent = raised > 0 ? Math.min(100, (raised / budget) * 100) : 0;
  const barWidth = raised > 0 ? Math.max(2, percent) : 0;
  const remaining = Math.max(budget - raised, 0);
  return (
    <div className="space-y-1">
      <div className="font-medium">{formatNgnCompact(budget)}</div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${barWidth}%` }}
          aria-label={`Raised ${raised} of ${budget}`}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {raised > 0
          ? `${formatNgnCompact(raised)} of ${formatNgnCompact(budget)} (${formatPercent(percent)})`
          : `0 raised`}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatNgnCompact(remaining)} left
      </div>
    </div>
  );
}

function formatNgnCompact(value: number) {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value.toLocaleString("en-NG")}`;
}

function formatReachCount(value: number | null, unitLabel: string) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("en-NG")} ${unitLabel}`;
}

function formatPercent(value: number) {
  if (value < 0.1) return "<0.1%";
  if (value < 1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

function formatCompactTimeline(start: string | null, end: string | null) {
  if (!start && !end) return "Dates pending";
  const parse = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const s = start ? parse(start) : null;
  const e = end ? parse(end) : null;
  const fmt = (date: Date, withYear: boolean) =>
    new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: withYear ? "numeric" : undefined,
    }).format(date);
  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();
    return sameYear ? `${fmt(s, false)} – ${fmt(e, true)}` : `${fmt(s, true)} – ${fmt(e, true)}`;
  }
  if (s) return `From ${fmt(s, true)}`;
  if (e) return `Until ${fmt(e, true)}`;
  return "Dates pending";
}

function LocationsCell({ areas }: { areas: string[] }) {
  if (areas.length === 0) return <span>TBD</span>;
  if (areas.length === 1) return <span>{areas[0]}</span>;
  return (
    <span title={areas.join(", ")} className="inline-flex items-center gap-1">
      <span className="truncate max-w-[120px]">{areas[0]}</span>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">+{areas.length - 1}</span>
    </span>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatter,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatter?: (value: string) => string;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      className="w-[160px]"
      placeholder={label}
      searchPlaceholder={`Search ${label.toLowerCase()}...`}
      options={[
        { value: "all", label: `All ${label.toLowerCase()}` },
        ...options.map((option) => ({
          value: option,
          label: formatter ? formatter(option) : option,
        })),
      ]}
    />
  );
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function pct(part: number, total: number) {
  return Math.round((part / total) * 100);
}

function formatStatus(value: string) {
  if (value === "all") return "All";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
