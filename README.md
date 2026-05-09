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

## Phase 1 Rule

Supabase stores rows and metadata only. Do not store photos, videos, scanned forms, generated PDFs, or base64 blobs in Supabase. Put those files in Google Drive and store the Drive file ID in Supabase.
