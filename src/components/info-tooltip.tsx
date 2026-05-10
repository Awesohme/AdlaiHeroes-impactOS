"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTooltip({
  content,
  className,
  size = 14,
}: {
  content: React.ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
            className,
          )}
          aria-label="More info"
        >
          <HelpCircle style={{ width: size, height: size }} />
        </TooltipTrigger>
        <TooltipContent className="leading-relaxed">{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
