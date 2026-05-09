# Adlai ImpactOps

Phase 1 web app for Adlai Heroes Foundation programme operations.

## Stack

- Next.js on Vercel for the frontend/app shell.
- Supabase for compact structured records, auth, row-level security, and audit metadata.
- Google Drive / Google Workspace Shared Drives for evidence files, generated reports, and backup archives.
- Google Sheets as a readable export/mirror, not the live database.

## First Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```

## Vercel

Vercel should use the default Next.js settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output: inferred by Vercel
- Node runtime: `24.x`

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Do not add `SUPABASE_SECRET_KEY` until a server-only route or scheduled job requires it.

For local OAuth callbacks, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
For Vercel production, set it to the deployed app URL.

## Launch Gates

Before real beneficiary data enters the system:

- Remove the temporary `dev_read_programmes` policy from `supabase/seed-dev.sql`.
- Add authenticated, role-aware RLS policies.
- Configure Google OAuth in Supabase.
- Confirm no secret key is exposed to the client bundle.
- Run and document a backup/restore test.

## Phase 1 Rule

Supabase stores rows and metadata only. Do not store photos, videos, scanned forms, generated PDFs, or base64 blobs in Supabase. Put those files in Google Drive and store the Drive file ID in Supabase.
