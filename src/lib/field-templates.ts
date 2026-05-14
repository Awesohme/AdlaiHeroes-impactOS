import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  programmeFieldCatalog,
  type ProgrammeFieldType,
} from "@/lib/programme-config";

export type FieldTemplate = {
  id: string | null;
  field_key: string;
  label: string;
  field_type: ProgrammeFieldType;
  description: string;
  default_required: boolean;
  position: number;
  options: string[];
};

export async function getFieldTemplates(): Promise<FieldTemplate[]> {
  if (!hasSupabaseBrowserEnv()) return fallbackCatalog();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("field_templates")
      .select(
        "id,field_key,label,field_type,description,default_required,position,options",
      )
      .order("position", { ascending: true });
    if (error || !data || data.length === 0) return fallbackCatalog();
    return data.map((row) => ({
      id: row.id,
      field_key: row.field_key,
      label: row.label,
      field_type: row.field_type as ProgrammeFieldType,
      description: row.description ?? "",
      default_required: row.default_required,
      position: row.position,
      options: Array.isArray(row.options) ? row.options.map((o: unknown) => String(o)) : [],
    }));
  } catch {
    return fallbackCatalog();
  }
}

function fallbackCatalog(): FieldTemplate[] {
  return programmeFieldCatalog.map((entry, index) => ({
    id: null,
    field_key: entry.field_key,
    label: entry.label,
    field_type: entry.field_type,
    description: entry.description,
    default_required: index < 4,
    position: index,
    options: [],
  }));
}
