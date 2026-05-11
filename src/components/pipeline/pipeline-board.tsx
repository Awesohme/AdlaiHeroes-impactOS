"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { EnrolmentSummary } from "@/app/(protected)/programmes/actions";
import { PipelineCard } from "@/components/pipeline/pipeline-card";
import { PipelineSidePanel } from "@/components/pipeline/pipeline-side-panel";

type ProgrammeOption = { id: string | null; code: string; name: string };
type StageOption = { id: string; label: string; position: number };

export function PipelineBoard({
  programmes,
  selectedCode,
  stages,
  enrolments,
}: {
  programmes: ProgrammeOption[];
  selectedCode: string | null;
  stages: StageOption[];
  enrolments: EnrolmentSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedEnrolment, setSelectedEnrolment] = useState<string | null>(null);
  const [panelOpenMobile, setPanelOpenMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setIsDesktop(query.matches);
      if (query.matches) setPanelOpenMobile(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const filteredEnrolments = useMemo(() => {
    const lower = query.toLowerCase();
    if (!lower) return enrolments;
    return enrolments.filter(
      (e) =>
        e.beneficiary_name.toLowerCase().includes(lower) ||
        e.beneficiary_code.toLowerCase().includes(lower),
    );
  }, [enrolments, query]);

  const byStage = useMemo(() => {
    const map = new Map<string, EnrolmentSummary[]>();
    map.set("_unstaged", []);
    stages.forEach((stage) => map.set(stage.id, []));
    for (const enrolment of filteredEnrolments) {
      const key = enrolment.stage_id ?? "_unstaged";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(enrolment);
    }
    return map;
  }, [stages, filteredEnrolments]);

  const selectedProgramme = programmes.find((p) => p.code === selectedCode) ?? null;
  const selected = filteredEnrolments.find((e) => e.enrolment_id === selectedEnrolment) ?? null;

  function changeProgramme(code: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("programme", code);
    setSelectedEnrolment(null);
    router.push(`/pipeline?${params.toString()}`);
  }

  function selectEnrolment(id: string) {
    setSelectedEnrolment(id);
    if (!isDesktop) setPanelOpenMobile(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCode ?? ""} onValueChange={changeProgramme}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose a programme" />
          </SelectTrigger>
          <SelectContent>
            {programmes.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {filteredEnrolments.length} of {enrolments.length} beneficiaries
        </span>
      </div>

      {stages.length === 0 && enrolments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              This programme has no pipeline stages and no enrolments yet.
            </p>
            <Button asChild variant="outline">
              <a href={`/programmes`}>Set up the pipeline</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-3 min-w-fit">
              {(byStage.get("_unstaged")?.length ?? 0) > 0 ? (
                <ColumnView
                  key="_unstaged"
                  label="Unstaged"
                  enrolments={byStage.get("_unstaged") ?? []}
                  selectedId={selected?.enrolment_id ?? null}
                  onSelect={selectEnrolment}
                />
              ) : null}
              {stages.map((stage) => (
                <ColumnView
                  key={stage.id}
                  label={stage.label}
                  enrolments={byStage.get(stage.id) ?? []}
                  selectedId={selected?.enrolment_id ?? null}
                  onSelect={selectEnrolment}
                />
              ))}
            </div>
          </div>

          <Card className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
            <CardContent className="p-4">
              <PipelineSidePanel
                enrolment={selected}
                stages={stages}
                programmeId={selectedProgramme?.id ?? null}
              />
            </CardContent>
          </Card>

          <Sheet
            open={!isDesktop && panelOpenMobile && !!selected}
            onOpenChange={(open) => {
              setPanelOpenMobile(open);
              if (!open) setSelectedEnrolment(null);
            }}
          >
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto lg:hidden">
              <SheetHeader>
                <SheetTitle className="text-sm">Process beneficiary</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <PipelineSidePanel
                  enrolment={selected}
                  stages={stages}
                  programmeId={selectedProgramme?.id ?? null}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}

function ColumnView({
  label,
  enrolments,
  selectedId,
  onSelect,
}: {
  label: string;
  enrolments: EnrolmentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="w-64 shrink-0 bg-muted/30">
      <CardHeader className="py-3 px-3 border-b">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-xs font-medium">{enrolments.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-2.5">
        {enrolments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Empty</p>
        ) : (
          enrolments.map((enrolment) => (
            <PipelineCard
              key={enrolment.enrolment_id}
              enrolment={enrolment}
              selected={selectedId === enrolment.enrolment_id}
              onSelect={() => onSelect(enrolment.enrolment_id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
