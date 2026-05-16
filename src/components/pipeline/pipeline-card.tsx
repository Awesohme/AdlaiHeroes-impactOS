"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EnrolmentSummary } from "@/app/(protected)/programmes/actions";
import { BeneficiaryAvatar } from "@/components/beneficiaries/beneficiary-avatar";

export function PipelineCard({
  enrolment,
  selected,
  onSelect,
  scorecardEnabled,
}: {
  enrolment: EnrolmentSummary;
  selected: boolean;
  onSelect: () => void;
  scorecardEnabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={cn(
        "w-full text-left rounded-md border bg-background p-2.5 hover:border-primary/40 transition-colors space-y-1.5",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BeneficiaryAvatar
            name={enrolment.beneficiary_name}
            driveFileId={enrolment.profile_image_drive_file_id}
            className="h-7 w-7 text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{enrolment.beneficiary_name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {enrolment.beneficiary_code}
            </p>
          </div>
        </div>
        {enrolment.consent_received ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="Consent received" />
        ) : null}
      </div>
      {scorecardEnabled && enrolment.scorecard_total !== null ? (
        <Badge variant="outline" className="font-normal text-xs">
          {enrolment.scorecard_total}/100
        </Badge>
      ) : null}
    </button>
  );
}
