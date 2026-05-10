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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBeneficiaryAction } from "@/app/(protected)/beneficiaries/create-actions";
import { nigeriaLocationOptions } from "@/lib/programme-config";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const genderOptions = [
  { value: "", label: "Not specified" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const consentOptions = [
  { value: "not_recorded", label: "Not recorded" },
  { value: "consent_captured", label: "Consent captured" },
  { value: "photo_consent_pending", label: "Photo consent pending" },
  { value: "declined", label: "Declined" },
];

const safeguardingOptions = [
  { value: "none", label: "None" },
  { value: "reviewed", label: "Reviewed" },
  { value: "follow_up_needed", label: "Follow-up needed" },
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
  const [gender, setGender] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [consent, setConsent] = useState("not_recorded");
  const [photoConsent, setPhotoConsent] = useState("not_recorded");
  const [safeguarding, setSafeguarding] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setGender("");
    setStateValue("");
    setConsent("not_recorded");
    setPhotoConsent("not_recorded");
    setSafeguarding("none");
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    formData.set("gender", gender);
    formData.set("state", stateValue);
    formData.set("consent_status", consent);
    formData.set("photo_video_consent", photoConsent);
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
          <Field label="Full name" required>
            <Input name="full_name" required placeholder="Chinedu I. Okafor" />
          </Field>

          <Field label="Beneficiary code" hint="Leave blank to auto-generate.">
            <Input name="beneficiary_code" placeholder="BEN-2026-000001" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of birth">
              <Input name="date_of_birth" type="date" />
            </Field>
            <Field label="Gender">
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.value || "_none"} value={option.value || "_none"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guardian name">
              <Input name="guardian_name" placeholder="Ifeoma Okafor" />
            </Field>
            <Field label="Guardian phone">
              <Input name="guardian_phone" placeholder="0803 123 4567" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Community">
              <Input name="community" placeholder="Karu" />
            </Field>
            <Field label="State">
              <Select value={stateValue} onValueChange={setStateValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose state" />
                </SelectTrigger>
                <SelectContent>
                  {nigeriaLocationOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="School">
            <Input name="school_name" placeholder="Government Secondary School, Karu" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Consent status">
              <Select value={consent} onValueChange={setConsent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Photo / video consent">
              <Select value={photoConsent} onValueChange={setPhotoConsent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Safeguarding flag">
            <Select value={safeguarding} onValueChange={setSafeguarding}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {safeguardingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
