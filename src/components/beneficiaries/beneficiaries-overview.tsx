"use client";

import { useState } from "react";
import type { BeneficiaryRow } from "@/lib/beneficiaries";
import type { ProgrammeRow } from "@/lib/programmes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricTile, type MetricTone } from "@/components/metric-tile";
import { Users, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Info, Plus } from "lucide-react";

export function BeneficiariesOverview({
  rows,
  programmes,
  source,
  error,
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
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const filteredRows = rows.filter((row) => {
    const queryMatch =
      !query ||
      row.full_name.toLowerCase().includes(query.toLowerCase()) ||
      row.beneficiary_code.toLowerCase().includes(query.toLowerCase()) ||
      row.guardian_phone.toLowerCase().includes(query.toLowerCase());
    const programmeMatch = programmeFilter === "all" || row.programme_name === programmeFilter;
    const safeguardingMatch = safeguardingFilter === "all" || row.risk_flag === safeguardingFilter;
    const statusMatch = statusFilter === "all" || row.current_status === statusFilter;
    return queryMatch && programmeMatch && safeguardingMatch && statusMatch;
  });

  const selected = rows.find((row) => row.beneficiary_code === selectedCode) ?? null;
  const programmeNames = [...new Set(programmes.map((p) => p.name))];
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
          <span>{error ?? "Showing fallback data."}</span>
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
            <Button size="sm" className="ml-auto" disabled>
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
                <TableHead>Community</TableHead>
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
                    onClick={() => setSelectedCode(row.beneficiary_code)}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {row.beneficiary_code}
                    </TableCell>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.programme_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.community}</TableCell>
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

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedCode(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {selected.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base">{selected.full_name}</SheetTitle>
                    <SheetDescription className="font-mono text-xs">
                      {selected.beneficiary_code}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 flex flex-wrap gap-1.5">
                <Badge variant="default" className="font-normal">
                  {formatStatus(selected.consent_status)}
                </Badge>
                <Badge
                  variant={selected.risk_flag === "review" ? "destructive" : "secondary"}
                  className="font-normal"
                >
                  {selected.risk_flag === "review" ? "Safeguarding review" : "Risk clear"}
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  {formatStatus(selected.current_status)}
                </Badge>
              </div>

              <DetailSection title="Personal & contact">
                <DetailItem label="Guardian" value={selected.guardian_name} />
                <DetailItem label="Phone" value={selected.guardian_phone} />
                <DetailItem label="Community" value={selected.community} />
                <DetailItem label="State" value={selected.state} />
                <DetailItem label="School" value={selected.school_name} />
              </DetailSection>

              <DetailSection title="Programme">
                <DetailItem label="Name" value={selected.programme_name} />
                <DetailItem
                  label="Code"
                  value={selected.programme_code ?? "Not linked"}
                />
                {selected.programme_modules.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selected.programme_modules.map((module) => (
                      <Badge key={module} variant="outline" className="font-normal">
                        {formatStatus(module)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </DetailSection>

              {selected.highlights.length ? (
                <DetailSection title="Signals">
                  <ul className="space-y-1.5">
                    {selected.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex justify-between text-sm border-b last:border-b-0 pb-1.5 last:pb-0"
                      >
                        <span className="text-muted-foreground">{formatStatus(highlight)}</span>
                        <span className="font-medium text-emerald-600">Live</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
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
    <section className="mt-6">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
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

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
