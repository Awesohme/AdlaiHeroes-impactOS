"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBeneficiaryAction } from "@/app/(protected)/beneficiaries/create-actions";
import { nigeriaLocationOptions } from "@/lib/programme-config";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/info-tooltip";
import { SearchableSelect } from "@/components/searchable-select";

const genderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const safeguardingOptions = [
  { value: "none", label: "None", helper: "No safeguarding concern is known at the point of capture." },
  { value: "reviewed", label: "Reviewed", helper: "A concern was checked and resolved or documented." },
  { value: "follow_up_needed", label: "Follow-up needed", helper: "This person needs active safeguarding follow-up before programme movement." },
];

export function BeneficiaryCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string, code: string) => void;
}) {
  const [gender, setGender] = useState("_none");
  const [stateValue, setStateValue] = useState("");
  const [safeguarding, setSafeguarding] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setGender("_none");
    setStateValue("");
    setSafeguarding("none");
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    formData.set("gender", gender === "_none" ? "" : gender);
    formData.set("state", stateValue);
    formData.set("consent_status", "not_recorded");
    formData.set("photo_video_consent", "not_recorded");
    formData.set("safeguarding_flag", safeguarding);
    setError(null);
    startTransition(async () => {
      const result = await createBeneficiaryAction(formData);
      if (result.ok) {
        reset();
        onCreated(result.beneficiaryId, result.beneficiaryCode);
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add beneficiary</SheetTitle>
          <SheetDescription>
            Capture the record. Enrol in a programme afterwards from the detail sheet.
          </SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="mt-6 space-y-4">
          <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Fields marked <span className="font-medium text-destructive">*</span> are required.
            Beneficiary code can be left blank; ImpactOps will generate one.
          </p>

          <Field label="Full name" required tooltip="Use the beneficiary's official or commonly used full name.">
            <Input name="full_name" required placeholder="Chinedu I. Okafor" />
          </Field>

          <Field
            label="Beneficiary code"
            hint="Optional. Leave blank to auto-generate."
            tooltip="Use a manual code only if you already have one from a previous register."
          >
            <Input name="beneficiary_code" placeholder="BEN-2026-000001" />
          </Field>

          <Field
            label="Profile image"
            hint="Optional. JPG, PNG, or WebP up to 8 MB."
            tooltip="A photo helps staff identify the beneficiary, but it is not required."
          >
            <Input
              type="file"
              name="profile_image"
              accept="image/jpeg,image/png,image/webp"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of birth" hint="Optional." tooltip="Capture this when age eligibility matters.">
              <Input name="date_of_birth" type="date" />
            </Field>
            <Field label="Gender" hint="Optional." tooltip="Used only for programme reporting and safeguarding context.">
              <SearchableSelect
                value={gender}
                onChange={setGender}
                options={[{ value: "_none", label: "Not selected" }, ...genderOptions]}
                placeholder="Choose gender"
                searchPlaceholder="Search gender..."
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guardian name" hint="Optional." tooltip="Capture the primary caregiver or emergency contact if known.">
              <Input name="guardian_name" placeholder="Ifeoma Okafor" />
            </Field>
            <Field label="Guardian phone" hint="Optional." tooltip="Used for follow-up, consent, and field coordination.">
              <Input name="guardian_phone" placeholder="0803 123 4567" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Community" hint="Optional." tooltip="Community or local area helps field staff find and filter records.">
              <Input name="community" placeholder="Karu" />
            </Field>
            <Field label="State" hint="Optional." tooltip="Select the Nigerian state or FCT when location is known.">
              <SearchableSelect
                value={stateValue}
                onChange={setStateValue}
                options={nigeriaLocationOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                placeholder="Choose state"
                searchPlaceholder="Search states..."
              />
            </Field>
          </div>

          <p className="text-xs text-muted-foreground">
            Consent is added later by uploading the signed form from the beneficiary&apos;s detail panel
            after they&apos;re enrolled in a programme.
          </p>

          <Field
            label="Safeguarding flag"
            tooltip={
              <ul className="space-y-1">
                {safeguardingOptions.map((option) => (
                  <li key={option.value}>
                    <strong>{option.label}</strong>: {option.helper}
                  </li>
                ))}
              </ul>
            }
          >
            <SearchableSelect
              value={safeguarding}
              onChange={setSafeguarding}
              options={safeguardingOptions}
              placeholder="Choose safeguarding flag"
              searchPlaceholder="Search safeguarding..."
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add beneficiary"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  required,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="inline-flex items-center gap-1.5">
        <span className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </span>
        {required ? <span className="text-[10px] font-normal text-muted-foreground">Required</span> : null}
        {tooltip ? <InfoTooltip content={tooltip} size={13} /> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
