"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/searchable-select";
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
      <SearchableSelect
        value={state || "_none"}
        onChange={(next) => {
          if (next === "_none") {
            onChange("");
            return;
          }
          onChange(next);
        }}
        options={[
          { value: "_none", label: "Pick a state" },
          ...states.map((s) => ({ value: s, label: s })),
        ]}
        placeholder="State"
        searchPlaceholder="Search states..."
      />
      <SearchableSelect
        value={lga || "_none"}
        onChange={(next) => {
          if (!state) return;
          if (next === "_none") {
            onChange(state);
            return;
          }
          onChange(`${state}${SEP}${next}`);
        }}
        disabled={!state || lgas.length === 0}
        options={[
          { value: "_none", label: "Pick an LGA" },
          ...lgas.map((l) => ({ value: l, label: l })),
        ]}
        placeholder={state ? "LGA" : "Pick a state first"}
        searchPlaceholder="Search LGAs..."
      />
    </div>
  );
}
