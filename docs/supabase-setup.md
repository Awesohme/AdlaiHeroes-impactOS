# Supabase Setup

## Project

Use the Adlai ImpactOps Supabase project URL in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Supabase now shows two key sections:

- Publishable key: safe for browser use when RLS is configured. Prefer this for `NEXT_PUBLIC_SUPABASE_ANON_KEY` if available.
- Secret key: full-access server key. Use only as `SUPABASE_SECRET_KEY` in server-side jobs/functions. Never expose it in the browser.

Legacy JWT anon keys can still work, but the current Supabase UI recommends publishable keys for client apps and secret keys for server apps.

Never commit `.env.local`.

## Initial Schema

Run `supabase/schema.sql` in the Supabase SQL Editor before entering real data.

The schema intentionally enables RLS but does not add permissive policies yet. That is deliberate: before production data, we need to add role-specific policies and test each role.

## Storage Rule

Do not use Supabase Storage for Phase 1 evidence. Store files in Google Drive and store only file metadata in the `evidence` table.

## Launch Gate

Before real beneficiary data:

- Google OAuth configured.
- RLS policies tested.
- Admin user created.
- Secret/server key absent from client bundle.
- Backup and restore tested.

## Google OAuth Redirects

In Supabase Authentication -> URL Configuration, add:

```text
http://localhost:3000/auth/callback
https://<vercel-production-domain>/auth/callback
```

Set `NEXT_PUBLIC_SITE_URL` in Vercel to the production app URL so OAuth redirects back to the correct callback route.

## Key Check

If the app cannot read Supabase after env vars are set, re-copy the keys from Supabase Project Settings -> API. A valid key must belong to the same project ref as `NEXT_PUBLIC_SUPABASE_URL`.

Known-good checks:

- The current anon key can read demo programmes after `seed-dev.sql` is run.
- The new `sb_secret_...` key works for privileged REST checks.
- The legacy JWT `service_role` key may be disabled/invalid when the project has moved to Supabase's newer key system.

## Development Seed

To confirm the deployed app can read from Supabase, run `supabase/seed-dev.sql` in SQL Editor. It inserts non-sensitive demo programmes and adds a temporary public read policy for `programmes`.

Remove or replace the `dev_read_programmes` policy before real data entry.
