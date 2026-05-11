import { hasSupabaseBrowserEnv } from "@/lib/env";
import { programmeTypeOptions } from "@/lib/programme-config";
import { createClient } from "@/lib/supabase/server";

export type ProgrammeTypeRow = {
  id: string | null;
  name: string;
  description: string;
  color: string | null;
  position: number;
  is_active: boolean;
};

export async function getProgrammeTypes(options?: { includeInactive?: boolean }) {
  if (!hasSupabaseBrowserEnv()) {
    return fallbackProgrammeTypes();
  }

  const supabase = await createClient();
  let query = supabase
    .from("programme_types")
    .select("id,name,description,color,position,is_active")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    return fallbackProgrammeTypes();
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: row.color ?? null,
    position: row.position ?? 0,
    is_active: row.is_active !== false,
  }));
}

export function fallbackProgrammeTypes(): ProgrammeTypeRow[] {
  return programmeTypeOptions.map((name, index) => ({
    id: null,
    name,
    description: "",
    color: null,
    position: index,
    is_active: true,
  }));
}
