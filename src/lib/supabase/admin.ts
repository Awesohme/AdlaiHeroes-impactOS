import { createClient } from "@supabase/supabase-js";

export class MissingServiceRoleError extends Error {
  constructor() {
    super(
      "Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server (or the legacy SUPABASE_SECRET_KEY).",
    );
    this.name = "MissingServiceRoleError";
  }
}

let warnedLegacy = false;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new MissingServiceRoleError();
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SECRET_KEY &&
    !warnedLegacy
  ) {
    warnedLegacy = true;
    console.warn(
      "[supabase] Using legacy env name SUPABASE_SECRET_KEY. Rename to SUPABASE_SERVICE_ROLE_KEY on Vercel when convenient.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
