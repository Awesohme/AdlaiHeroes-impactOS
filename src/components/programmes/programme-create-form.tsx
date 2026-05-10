"use client";

import { useActionState, useState, type Dispatch, type SetStateAction } from "react";
import { useFormStatus } from "react-dom";
import {
  defaultProgrammeFieldKeys,
  getProgrammeStatusLabel,
  moduleOptions,
  nigeriaLocationOptions,
  programmeFieldCatalog,
  programmeStatusOptions,
  programmeTypeOptions,
  type ProgrammeModuleKey,
} from "@/lib/programme-config";
import type { ProgrammeDataFieldRow, ProgrammeRow } from "@/lib/programmes";
import { saveProgrammeAction, type SaveProgrammeState } from "@/app/(protected)/programmes/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: SaveProgrammeState = {};

type ProgrammeCreateFormProps = {
  mode?: "create" | "edit";
  initialProgramme?: ProgrammeRow | null;
};

export function ProgrammeCreateForm({
  mode = "create",
  initialProgramme,
}: ProgrammeCreateFormProps) {
  const [state, formAction] = useActionState(saveProgrammeAction, initialState);

  const initialLocations =
    parseJsonArray(state.fields?.location_areas_json) ||
    initialProgramme?.location_areas ||
    ["Abuja, FCT"];
  const initialModules =
    (parseJsonArray(state.fields?.enabled_modules_json) as ProgrammeModuleKey[]) ||
    initialProgramme?.enabled_modules ||
    ["beneficiaries", "activities", "evidence", "reporting", "education_support"];
  const initialFields =
    parseDataFields(state.fields?.data_fields_json) ||
    initialProgramme?.data_fields ||
    buildDefaultFieldSet();

  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialLocations);
  const [enabledModules, setEnabledModules] = useState<ProgrammeModuleKey[]>(initialModules);
  const [selectedFields, setSelectedFields] = useState<ProgrammeDataFieldRow[]>(initialFields);
  const [name, setName] = useState(state.fields?.name ?? initialProgramme?.name ?? "");
  const [programmeType, setProgrammeType] = useState(
    state.fields?.programme_type ?? initialProgramme?.programme_type ?? "Education Support",
  );
  const [status, setStatus] = useState(state.fields?.status ?? initialProgramme?.status ?? "draft");
  const [donorFunder, setDonorFunder] = useState(
    state.fields?.donor_funder ?? initialProgramme?.donor_funder ?? "Adlai Heroes Foundation",
  );
  const [targetGroup, setTargetGroup] = useState(
    state.fields?.target_group ?? initialProgramme?.target_group ?? "",
  );
  const [expectedBeneficiaries, setExpectedBeneficiaries] = useState(
    state.fields?.expected_beneficiaries ??
      formatNullableNumber(initialProgramme?.expected_beneficiaries),
  );
  const [budgetNgn, setBudgetNgn] = useState(
    state.fields?.budget_ngn ?? formatCurrencyInput(initialProgramme?.budget_ngn),
  );
  const [objectives, setObjectives] = useState(
    state.fields?.objectives ?? initialProgramme?.objectives ?? "",
  );
  const [description, setDescription] = useState(
    state.fields?.programme_description ?? initialProgramme?.programme_description ?? "",
  );
  const [startDate, setStartDate] = useState(
    state.fields?.start_date ?? initialProgramme?.start_date ?? "",
  );
  const [endDate, setEndDate] = useState(state.fields?.end_date ?? initialProgramme?.end_date ?? "");

  const availableFields = programmeFieldCatalog.filter(
    (field) => !selectedFields.some((selectedField) => selectedField.field_key === field.field_key),
  );
  const summaryStatus = mode === "create" && status === "draft" ? "draft" : status;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input name="programme_id" type="hidden" value={initialProgramme?.id ?? ""} />
      <input name="location_areas_json" type="hidden" value={JSON.stringify(selectedLocations)} />
      <input name="enabled_modules_json" type="hidden" value={JSON.stringify(enabledModules)} />
      <input name="data_fields_json" type="hidden" value={JSON.stringify(selectedFields)} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Programme details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Delivery frame, funding, locations, and beneficiary expectations.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Programme name">
              <Input
                defaultValue={name}
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Girls' Education & Dignity Initiative"
              />
            </Field>

            <Field label="Programme type">
              <Select value={programmeType} onValueChange={setProgrammeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programmeTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="programme_type" value={programmeType} />
            </Field>

            <Field label="Donor / funder">
              <Input
                defaultValue={donorFunder}
                name="donor_funder"
                onChange={(event) => setDonorFunder(event.target.value)}
                placeholder="Adlai Heroes Foundation"
              />
            </Field>

            <Field label="Programme code" hint="Leave blank to auto-generate.">
              <Input
                defaultValue={state.fields?.programme_code ?? initialProgramme?.programme_code ?? ""}
                name="programme_code"
                placeholder="PRG-2026-0001"
              />
            </Field>

            <Field label="Start date">
              <Input
                defaultValue={startDate}
                name="start_date"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
              />
            </Field>

            <Field label="End date">
              <Input
                defaultValue={endDate}
                name="end_date"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
              />
            </Field>

            <Field label="Target group">
              <Input
                defaultValue={targetGroup}
                name="target_group"
                onChange={(event) => setTargetGroup(event.target.value)}
                placeholder="Adolescent girls (10–19 years)"
              />
            </Field>

            <Field label="Expected beneficiaries">
              <Input
                defaultValue={expectedBeneficiaries}
                inputMode="numeric"
                name="expected_beneficiaries"
                onChange={(event) => setExpectedBeneficiaries(event.target.value)}
                placeholder="1200"
              />
            </Field>

            <Field label="Budget (NGN)">
              <Input
                defaultValue={budgetNgn}
                inputMode="decimal"
                name="budget_ngn"
                onChange={(event) => setBudgetNgn(event.target.value)}
                placeholder="25,000,000"
              />
            </Field>

            <Field label="Programme status">
              <Select value={summaryStatus} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programmeStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={summaryStatus} />
            </Field>

            <div className="sm:col-span-2 space-y-2">
              <Label>Operating locations</Label>
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {selectedLocations.length ? (
                    selectedLocations.map((location) => (
                      <button
                        key={location}
                        type="button"
                        onClick={() => removeLocation(location, setSelectedLocations)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                      >
                        {location}
                        <X className="h-3 w-3" />
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Pick one or more locations from the list below.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 max-h-48 overflow-y-auto">
                  {nigeriaLocationOptions.map((location) => {
                    const active = selectedLocations.includes(location);
                    return (
                      <button
                        key={location}
                        type="button"
                        onClick={() => toggleLocation(location, setSelectedLocations)}
                        className={cn(
                          "rounded px-2 py-1 text-left text-xs transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-background",
                        )}
                      >
                        {location}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Field label="Objectives" className="sm:col-span-2">
              <Textarea
                defaultValue={objectives}
                maxLength={500}
                name="objectives"
                onChange={(event) => setObjectives(event.target.value)}
                placeholder="Operational and beneficiary outcome the programme should achieve."
                rows={3}
              />
            </Field>

            <Field label="Programme description" className="sm:col-span-2">
              <Textarea
                defaultValue={description}
                maxLength={1000}
                name="programme_description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="How this programme will be delivered, modules used, what teams should capture."
                rows={4}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="text-left">
                    <p className="font-medium">Advanced setup</p>
                    <p className="text-sm text-muted-foreground font-normal">
                      Tailored data fields and module access. Optional.
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-6 pb-0">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Available fields</p>
                        <p className="text-xs text-muted-foreground">
                          Pick the data the team should collect.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {availableFields.map((field) => (
                          <div
                            key={field.field_key}
                            className="flex items-start gap-3 rounded-md border p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{field.label}</p>
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                              <Badge variant="outline" className="mt-2 font-normal text-xs">
                                {field.field_type.replace("_", "/")}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => addField(field.field_key, setSelectedFields)}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        ))}
                        {availableFields.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">All fields added.</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Included fields</p>
                        <p className="text-xs text-muted-foreground">
                          Reorder and mark required fields.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {selectedFields.map((field, index) => (
                          <div
                            key={field.field_key}
                            className="flex items-center gap-2 rounded-md border p-2"
                          >
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveField(index, -1, setSelectedFields)}
                                className="rounded p-0.5 disabled:opacity-30 hover:bg-muted"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={index === selectedFields.length - 1}
                                onClick={() => moveField(index, 1, setSelectedFields)}
                                className="rounded p-0.5 disabled:opacity-30 hover:bg-muted"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{field.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {field.field_type.replace("_", "/")}
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={() =>
                                  toggleFieldRequired(field.field_key, setSelectedFields)
                                }
                                className="h-3.5 w-3.5 rounded border-input"
                              />
                              Required
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeField(field.field_key, setSelectedFields)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div>
                      <p className="text-sm font-medium">Modules enabled</p>
                      <p className="text-xs text-muted-foreground">
                        Operational modules this programme uses from day one.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {moduleOptions.map((module) => {
                        const active = enabledModules.includes(module.key);
                        return (
                          <label
                            key={module.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                              active && "border-primary/40 bg-primary/5",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleModule(module.key, setEnabledModules)}
                              className="mt-0.5 h-4 w-4 rounded border-input"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{module.label}</p>
                              <p className="text-xs text-muted-foreground">{module.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {state.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">Save blocked.</p>
            <p>{state.error}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 justify-end">
          <SubmitButton intent="draft" label={mode === "edit" ? "Save changes" : "Save draft"} />
          <SubmitButton
            intent="publish"
            label={mode === "edit" ? "Update programme" : "Publish programme"}
            primary
          />
        </div>
      </div>

      <aside className="space-y-4">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
            <CardTitle className="text-lg">{name || "Untitled programme"}</CardTitle>
            <Badge variant={statusVariant(summaryStatus)} className="self-start font-normal">
              {getProgrammeStatusLabel(summaryStatus)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{programmeType || "Programme type pending"}</p>
            <p className="text-muted-foreground">
              {selectedLocations.join(", ") || "No locations selected"}
            </p>
            <p className="text-muted-foreground">{timelineLabel(startDate, endDate)}</p>
            <div className="border-t pt-3 space-y-2">
              <Stat label="Expected beneficiaries" value={expectedBeneficiaries || "—"} />
              <Stat
                label="Budget"
                value={budgetNgn ? `NGN ${formatBudget(budgetNgn)}` : "—"}
              />
              <Stat label="Donor / funder" value={donorFunder || "—"} />
              <Stat label="Modules" value={enabledModules.length} />
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SubmitButton({
  intent,
  label,
  primary = false,
}: {
  intent: "draft" | "publish";
  label: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={primary ? "default" : "outline"}
      disabled={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "completed") return "default";
  if (status === "at_risk") return "destructive";
  return "secondary";
}

function buildDefaultFieldSet(): ProgrammeDataFieldRow[] {
  return defaultProgrammeFieldKeys.map((fieldKey, index) => {
    const definition = programmeFieldCatalog.find((field) => field.field_key === fieldKey);
    return {
      field_key: fieldKey,
      label: definition?.label ?? fieldKey,
      field_type: definition?.field_type ?? "text",
      required: index < 4,
      position: index,
      enabled: true,
    };
  });
}

function parseJsonArray(raw?: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null;
  } catch {
    return null;
  }
}

function parseDataFields(raw?: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProgrammeDataFieldRow[]) : null;
  } catch {
    return null;
  }
}

function toggleLocation(
  location: string,
  setSelectedLocations: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedLocations((current) =>
    current.includes(location)
      ? current.filter((item) => item !== location)
      : [...current, location],
  );
}

function removeLocation(
  location: string,
  setSelectedLocations: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedLocations((current) => current.filter((item) => item !== location));
}

function addField(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  const definition = programmeFieldCatalog.find((field) => field.field_key === fieldKey);
  if (!definition) return;
  setSelectedFields((current) => [
    ...current,
    {
      field_key: definition.field_key,
      label: definition.label,
      field_type: definition.field_type,
      required: false,
      position: current.length,
      enabled: true,
    },
  ]);
}

function removeField(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) =>
    current
      .filter((field) => field.field_key !== fieldKey)
      .map((field, index) => ({ ...field, position: index })),
  );
}

function moveField(
  index: number,
  direction: -1 | 1,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const cloned = [...current];
    const [item] = cloned.splice(index, 1);
    cloned.splice(nextIndex, 0, item);
    return cloned.map((field, position) => ({ ...field, position }));
  });
}

function toggleFieldRequired(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) =>
    current.map((field) =>
      field.field_key === fieldKey ? { ...field, required: !field.required } : field,
    ),
  );
}

function toggleModule(
  moduleKey: ProgrammeModuleKey,
  setEnabledModules: Dispatch<SetStateAction<ProgrammeModuleKey[]>>,
) {
  setEnabledModules((current) =>
    current.includes(moduleKey)
      ? current.filter((item) => item !== moduleKey)
      : [...current, moduleKey],
  );
}

function formatNullableNumber(value?: number | null) {
  return value ? String(value) : "";
}

function formatCurrencyInput(value?: number | null) {
  return value ? value.toLocaleString("en-NG") : "";
}

function formatBudget(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-NG") : value;
}

function timelineLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "Date range not set";
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  return startDate ? `Starts ${startDate}` : `Ends ${endDate}`;
}
