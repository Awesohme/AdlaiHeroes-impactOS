# Supabase Setup

## Project

Use the Adlai ImpactOps Supabase project URL in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never commit `.env.local`.

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
- Service-role key absent from client bundle.
- Backup and restore tested.
