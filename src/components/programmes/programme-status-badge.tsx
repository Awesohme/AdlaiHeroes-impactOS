import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function programmeStatusBadgeClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
  if (status === "completed") return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100";
  if (status === "monitoring") return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
  if (status === "planned") return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100";
  if (status === "at_risk") return "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100";
  return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100";
}

export function formatProgrammeStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProgrammeStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge className={cn("font-normal", programmeStatusBadgeClass(status), className)}>
      {formatProgrammeStatus(status)}
    </Badge>
  );
}
