"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProgrammeRow } from "@/lib/programmes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricTile, type MetricTone } from "@/components/metric-tile";
import { FolderKanban, Activity, ClipboardList, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function ProgrammesOverview({
  rows,
  source,
  error,
  notice,
}: {
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
  notice?: string;
}) {
  const [yearFilter, setYearFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [donorFilter, setDonorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ProgrammeRow | null>(null);

  const filteredRows = rows.filter((row) => {
    const yearMatch =
      yearFilter === "all" ||
      row.start_date?.startsWith(yearFilter) ||
      row.end_date?.startsWith(yearFilter);
    const locationMatch = locationFilter === "all" || row.location_areas.includes(locationFilter);
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
  const locations = uniqueValues(rows.flatMap((row) => row.location_areas));
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
                <TableHead className="text-right">Reach</TableHead>
                <TableHead className="text-right">Budget (NGN)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Flyer</TableHead>
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
                      <div className="text-xs text-muted-foreground">{row.programme_code}</div>
                    </TableCell>
                    <TableCell className="text-sm">{row.programme_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <LocationsCell areas={row.location_areas} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {row.timeline_label}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.expected_beneficiaries?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.budget_ngn ? row.budget_ngn.toLocaleString("en-NG") : "—"}
                    </TableCell>
                    <TableCell>
                      <ProgrammeStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.flyer_drive_file_id ? (
                        <a
                          href={`https://drive.google.com/file/d/${row.flyer_drive_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
      />
    </div>
  );
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {formatter ? formatter(option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

