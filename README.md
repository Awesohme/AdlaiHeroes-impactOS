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
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

`GOOGLE_DRIVE_CLIENT_SECRET` and `GOOGLE_DRIVE_REFRESH_TOKEN` must stay server-side only.

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
- Configure Google Drive upload auth for the current rollout.
- Confirm no secret key is exposed to the client bundle.
- Run and document a backup/restore test.

## Google Drive Evidence Automation

ImpactOps uploads evidence files directly into Google Drive from the backend. Staff should not enter raw Drive file IDs manually in normal operation.

Current rollout setup:

1. Enable the Google Drive API in the Adlai Google Cloud project.
2. Create or reuse a Web OAuth client.
3. Set:
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REFRESH_TOKEN`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
4. Authorize the uploader Google account once and store the refresh token in Vercel.
5. Use the Settings page to run the Drive root test.

Later, when Google Workspace Shared Drives are approved, the backend can switch back to service-account mode for cleaner NGO-owned storage.

Routing rules:

- Each programme gets a cached Drive folder named `${programme_code} - ${programme_name}`.
- Evidence uploads are routed into evidence-type subfolders such as `Documents`, `Photos`, `Videos`, and `Attendance`.
- Supabase stores the returned Drive metadata only.

## Phase 1 Rule

Supabase stores rows and metadata only. Do not store photos, videos, scanned forms, generated PDFs, or base64 blobs in Supabase. Put those files in Google Drive and store the Drive file ID in Supabase.
