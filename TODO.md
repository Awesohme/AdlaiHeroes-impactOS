# TODO

## Now

- Verify Google sign-in persists across refresh, direct URLs, and sidebar navigation.
- Use `/auth/debug` to compare middleware auth state, server user reads, and auth cookie names if the session still fails.
- Keep `/programmes` on sample rows until the auth flow is stable.
- Only after auth is stable: rerun `supabase/admin-bootstrap.sql` and restore live Programme reads.

## Next

- Build reference-aligned Programmes list screen.
- Add Create Programme flow.
- Add Beneficiaries list and detail panel.
- Add Evidence metadata flow with Google Drive storage plan.

## Later

- Google Workspace Shared Drive integration.
- Google Sheets backup/export job.
- Education sponsorship workflow.
- Donor report generation.
