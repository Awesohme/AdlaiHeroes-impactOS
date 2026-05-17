"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { IntegrationTestActionResult } from "@/app/(protected)/settings/actions";

type Props = {
  action: () => Promise<IntegrationTestActionResult>;
  defaultLabel: string;
  successLabel: string;
  variant?: "default" | "outline";
  onResult: (result: IntegrationTestActionResult) => void;
};

export function IntegrationTestButton({
  action,
  defaultLabel,
  successLabel,
  variant = "default",
  onResult,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [succeeded, setSucceeded] = useState(false);

  function run() {
    setSucceeded(false);
    startTransition(async () => {
      const result = await action();
      onResult(result);
      if (result.ok) {
        setSucceeded(true);
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button type="button" size="sm" variant={variant} onClick={run} disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {!pending && succeeded ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
      {pending ? "Testing..." : succeeded ? successLabel : defaultLabel}
    </Button>
  );
}
