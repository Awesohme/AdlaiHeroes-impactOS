"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEvidenceNotes, type EvidenceNote } from "@/lib/evidence";

const validStatuses = new Set(["in_review", "verified", "consent_check"]);

export type UpdateEvidenceStatusResult = {
  ok: boolean;
  error?: string;
};

export async function updateEvidenceStatusAction(
  evidenceId: string,
  status: string,
): Promise<UpdateEvidenceStatusResult> {
  if (!validStatuses.has(status)) {
    return { ok: false, error: "Choose a valid verification status." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("evidence")
    .update({ verification_status: status })
    .eq("id", evidenceId);

  if (error) {
    if (error.message.includes("row-level security") || error.message.includes("permission denied")) {
      return {
        ok: false,
        error: "Database write access is not enabled. Run the evidence write policy SQL.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/evidence");
  return { ok: true };
}

export type AddEvidenceNoteResult = {
  ok: boolean;
  error?: string;
  notes?: EvidenceNote[];
};

export async function addEvidenceNoteAction(
  evidenceId: string,
  body: string,
): Promise<AddEvidenceNoteResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  if (trimmed.length > 2000) return { ok: false, error: "Note must be under 2000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("evidence_notes").insert({
    evidence_id: evidenceId,
    author_id: user.id,
    body: trimmed,
  });

  if (error) {
    if (error.message.includes("row-level security") || error.message.includes("permission denied")) {
      return {
        ok: false,
        error: "Database write access is not enabled. Run the evidence_notes policy SQL.",
      };
    }
    if (error.message.includes("relation \"public.evidence_notes\"") || error.message.includes("does not exist")) {
      return {
        ok: false,
        error: "evidence_notes table is not live yet. Run the latest SQL in Supabase, then try again.",
      };
    }
    return { ok: false, error: error.message };
  }

  const notes = await getEvidenceNotes(evidenceId);
  return { ok: true, notes };
}

export async function loadEvidenceNotesAction(evidenceId: string): Promise<EvidenceNote[]> {
  return getEvidenceNotes(evidenceId);
}
