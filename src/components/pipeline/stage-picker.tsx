"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { moveEnrolmentStageAction } from "@/app/(protected)/beneficiaries/actions";
import { cn } from "@/lib/utils";

type Stage = { id: string; label: string; position: number };

export function StagePicker({
  enrolmentId,
  currentStageId,
  stages,
  onMoved,
}: {
  enrolmentId: string;
  currentStageId: string | null;
  stages: Stage[];
  onMoved?: () => void;
}) {
  const [picked, setPicked] = useState<string>(currentStageId ?? "_unstaged");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPicked(currentStageId ?? "_unstaged");
    setFeedback(null);
  }, [currentStageId, enrolmentId]);

  const current = stages.find((s) => s.id === currentStageId) ?? null;
  const dirty = picked !== (currentStageId ?? "_unstaged");

  function move() {
    if (!dirty) return;
    setFeedback(null);
    const target = picked === "_unstaged" ? null : picked;
    startTransition(async () => {
      const result = await moveEnrolmentStageAction(enrolmentId, target);
      if (result.ok) {
        setFeedback("Stage updated.");
        onMoved?.();
      } else {
        setFeedback(result.error);
      }
    });
  }

  if (!stages.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Define stages on the programme first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={picked} onValueChange={setPicked}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Choose stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_unstaged">
              Unstaged{!currentStageId ? " · current" : ""}
            </SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.label}
                {currentStageId === stage.id ? " · current" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={move} disabled={pending || !dirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
        </Button>
      </div>
      {current ? (
        <p className="text-xs text-muted-foreground">
          Current stage: <span className="font-medium">{current.label}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No stage set.</p>
      )}
      {feedback ? (
        <p
          className={cn(
            "text-xs",
            feedback === "Stage updated." ? "text-emerald-700" : "text-destructive",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
