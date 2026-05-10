"use client";

import { useState } from "react";
import type { BeneficiaryRow } from "@/lib/beneficiaries";
import type { ProgrammeRow } from "@/lib/programmes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricTile, type MetricTone } from "@/components/metric-tile";
import { Users, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { Search, Info, Plus } from "lucide-react";
import { BeneficiaryDetailSheet } from "@/components/beneficiaries/beneficiary-detail-sheet";
import { BeneficiaryCreateSheet } from "@/components/beneficiaries/beneficiary-create-sheet";
import { useRouter } from "next/navigation";

export function BeneficiariesOverview({
  rows,
  programmes,
  source,
}: {
  rows: BeneficiaryRow[];
  programmes: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [safeguardingFilter, setSafeguardingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected] = useState<BeneficiaryRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const filteredRows = rows.filter((row) => {
    const queryMatch =
      !query ||
      row.full_name.toLowerCase().includes(query.toLowerCase()) ||
      row.beneficiary_code.toLowerCase().includes(query.toLowerCase()) ||
      row.guardian_phone.toLowerCase().includes(query.toLowerCase());
    const programmeMatch = programmeFilter === "all" || row.programme_name === programmeFilter;
    const safeguardingMatch = safeguardingFilter === "all" || row.risk_flag === safeguardingFilter;
    const statusMatch = statusFilter === "all" || row.current_status === statusFilter;
    const stageMatch =
      stageFilter === "all" ||
      (stageFilter === "_unstaged" ? !row.stage_label : row.stage_label === stageFilter);
    return queryMatch && programmeMatch && safeguardingMatch && statusMatch && stageMatch;
  });

  const programmeNames = [...new Set(programmes.map((p) => p.name))];
  const stages = [
    ...new Set(rows.map((row) => row.stage_label).filter((label): label is string => !!label)),
  ];
  const metrics = {
    total: rows.length,
    consentCaptured: rows.filter((row) => row.consent_status.includes("captured")).length,
    flagged: rows.filter((row) => row.risk_flag === "review").length,
    active: rows.filter((row) => row.current_status === "active").length,
  };

  const counters: Array<{
    label: string;
    value: number;
    detail: string;
    tone: MetricTone;
    icon: LucideIcon;
  }> = [
    { label: "Total", value: metrics.total, detail: "All records", tone: "purple", icon: Users },
    {
      label: "Consent captured",
      value: metrics.consentCaptured,
      detail: "Ready for use",
      tone: "green",
      icon: ShieldCheck,
    },
    {
      label: "Safeguarding watch",
      value: metrics.flagged,
      detail: "Needs review",
      tone: "amber",
      icon: AlertTriangle,
    },
    {
      label: "Active",
      value: metrics.active,
      detail: "In programme",
      tone: "teal",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      {source === "mock" ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            You haven&apos;t added any beneficiaries yet — showing example records. Click
            &quot;Add beneficiary&quot; to start.
          </span>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((stat) => (
          <MetricTile key={stat.label} {...stat} />
        ))}
      </section>

      <Card>
        <CardHeader className="border-b space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, or phone…"
                className="pl-9"
              />
            </div>
            <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add beneficiary
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Programme"
              value={programmeFilter}
              onChange={setProgrammeFilter}
              options={programmeNames}
            />
            <FilterSelect
              label="Stage"
              value={stageFilter}
              onChange={setStageFilter}
              options={stages}
              extraOptions={[{ value: "_unstaged", label: "Unstaged" }]}
            />
            <FilterSelect
              label="Safeguarding"
              value={safeguardingFilter}
              onChange={setSafeguardingFilter}
              options={["clear", "review"]}
              formatter={formatStatus}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["active", "pending", "follow_up", "exited"]}
              formatter={formatStatus}
            />
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredRows.length} of {rows.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                    No beneficiaries match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.beneficiary_code}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {row.beneficiary_code}
                    </TableCell>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.programme_name}
                    </TableCell>
                    <TableCell>
                      {row.stage_label ? (
                        <Badge variant="outline" className="font-normal">
                          {row.stage_label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {row.last_activity}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.consent_status.includes("captured") ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {formatStatus(row.consent_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.risk_flag === "review" ? "destructive" : "secondary"}
                        className="font-normal"
                      >
                        {row.risk_flag === "review" ? "Review" : "Clear"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.current_status === "active" ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {formatStatus(row.current_status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BeneficiaryDetailSheet
        beneficiary={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        programmes={programmes}
      />

      <BeneficiaryCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatter,
  extraOptions,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatter?: (value: string) => string;
  extraOptions?: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {extraOptions?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {formatter ? formatter(option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
