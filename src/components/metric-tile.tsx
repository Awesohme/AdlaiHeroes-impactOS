import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type MetricTone = "purple" | "teal" | "blue" | "amber" | "green" | "red";

const toneStyles: Record<MetricTone, { card: string; bar: string; chip: string }> = {
  purple: {
    card: "bg-purple-50/60",
    bar: "bg-purple-500",
    chip: "bg-purple-100 text-purple-700",
  },
  teal: {
    card: "bg-teal-50/60",
    bar: "bg-teal-500",
    chip: "bg-teal-100 text-teal-700",
  },
  blue: {
    card: "bg-blue-50/60",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700",
  },
  amber: {
    card: "bg-amber-50/60",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
  },
  green: {
    card: "bg-emerald-50/60",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
  },
  red: {
    card: "bg-rose-50/60",
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
  },
};

export function MetricTile({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone: MetricTone;
  icon: LucideIcon;
}) {
  const styles = toneStyles[tone];
  return (
    <Card className={cn("relative overflow-hidden", styles.card)}>
      <span className={cn("absolute inset-y-0 left-0 w-1", styles.bar)} aria-hidden="true" />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            styles.chip,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
