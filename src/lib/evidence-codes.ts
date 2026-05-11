import type { createClient } from "@/lib/supabase/server";

export async function generateEvidenceCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const year = new Date().getFullYear();
  const prefix = `EVD-${year}-`;

  const { data } = await supabase
    .from("evidence")
    .select("evidence_code")
    .ilike("evidence_code", `${prefix}%`)
    .order("evidence_code", { ascending: false })
    .limit(50);

  const highest = (data ?? []).reduce((max, row) => {
    const match = row.evidence_code.match(/(\d{4})$/);
    const current = match ? Number(match[1]) : 0;
    return current > max ? current : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}
