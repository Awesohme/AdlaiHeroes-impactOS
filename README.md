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
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must stay server-side only. In Vercel, add it as a normal server env var and preserve line breaks with `\n`.

Do not add `SUPABASE_SECRET_KEY` until a server-only route or scheduled job requires it.

For local OAuth callbacks, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
For Vercel production, set it to:

```bash
NEXT_PUBLIC_SITE_URL=https://adlai-heroes-impact-os.vercel.app
```

## Launch Gates

Before real beneficiary data enters the system:

- Remove the temporary `dev_read_programmes` policy from `supabase/seed-dev.sql`.
- Add authenticated, role-aware RLS policies.
- Configure Google OAuth in Supabase.
- Configure the Google Drive service account and share the chosen root folder or Shared Drive with that service account email.
- Confirm no secret key is exposed to the client bundle.
- Run and document a backup/restore test.

## Google Drive Evidence Automation

ImpactOps uploads evidence files directly into Google Drive from the backend. Staff should not enter raw Drive file IDs manually in normal operation.

Required setup:

1. Enable the Google Drive API in the Adlai Google Cloud project.
2. Create a service account.
3. Set:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
4. Share the chosen root folder or Shared Drive with the service account email.
5. Use the Settings page to run the Drive root test.

Routing rules:

- Each programme gets a cached Drive folder named `${programme_code} - ${programme_name}`.
- Evidence uploads are routed into evidence-type subfolders such as `Documents`, `Photos`, `Videos`, and `Attendance`.
- Supabase stores the returned Drive metadata only.

## Phase 1 Rule

Supabase stores rows and metadata only. Do not store photos, videos, scanned forms, generated PDFs, or base64 blobs in Supabase. Put those files in Google Drive and store the Drive file ID in Supabase.
