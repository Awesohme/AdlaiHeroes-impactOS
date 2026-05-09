import { createClient } from "@supabase/supabase-js";
import { programmeRows } from "@/lib/sample-records";

export type ProgrammeRow = {
  programme_code: string;
  name: string;
  programme_type: string;
  status: string;
  reach: string;
};

type ProgrammeRecord = {
  programme_code: string;
  name: string;
  programme_type: string;
  status: string;
};

export async function getProgrammes(): Promise<{
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: "Supabase env vars are not configured.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("programmes")
    .select("programme_code,name,programme_type,status")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: error.message,
    };
  }

  if (!data?.length) {
    return {
      rows: mockProgrammes(),
      source: "mock",
      error: "Supabase returned no programmes yet.",
    };
  }

  return {
    rows: data.map(formatProgramme),
    source: "supabase",
  };
}

function formatProgramme(programme: ProgrammeRecord): ProgrammeRow {
  return {
    programme_code: programme.programme_code,
    name: programme.name,
    programme_type: programme.programme_type,
    status: programme.status,
    reach: "Live record",
  };
}

function mockProgrammes(): ProgrammeRow[] {
  return programmeRows.map(([programme_code, name, programme_type, status, reach]) => ({
    programme_code: String(programme_code),
    name: String(name),
    programme_type: String(programme_type),
    status: String(status),
    reach: String(reach),
  }));
}
