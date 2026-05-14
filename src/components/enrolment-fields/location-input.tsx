"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLgas, getStates } from "@/lib/nigeria-locations";

const SEP = " / ";

export function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const states = useMemo(() => getStates(), []);
  const [state, lga] = useMemo(() => {
    if (!value || !value.includes(SEP)) return [value || "", ""];
    const [s, l] = value.split(SEP);
    return [s ?? "", l ?? ""];
  }, [value]);

  const lgas = useMemo(() => (state ? getLgas(state) : []), [state]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Select
        value={state || "_none"}
        onValueChange={(next) => {
          if (next === "_none") {
            onChange("");
            return;
          }
          onChange(next);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— Pick a state —</SelectItem>
          {states.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={lga || "_none"}
        onValueChange={(next) => {
          if (!state) return;
          if (next === "_none") {
            onChange(state);
            return;
          }
          onChange(`${state}${SEP}${next}`);
        }}
        disabled={!state || lgas.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={state ? "LGA" : "Pick a state first"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— Pick an LGA —</SelectItem>
          {lgas.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
