# Build Roadmap

## Milestone 0: Foundation

- Create Next.js app shell for Vercel.
- Add Supabase environment configuration.
- Define initial Postgres schema and RLS expectations.
- Define Google Drive folder structure and backup policy.
- Create mock dashboard so stakeholders can review the product direction early.

## Milestone 1: Auth and Roles

- Configure Supabase project.
- Enable Google OAuth.
- Restrict access to approved Adlai users.
- Add `profiles`, `roles`, and `role_permissions`.
- Enable RLS before any real data entry.

## Milestone 2: Core Records

- Programmes CRUD.
- Beneficiaries CRUD with consent fields.
- Enrolments.
- Activities and attendance.
- Evidence metadata rows.

## Milestone 3: Google Drive Integration

- Create Drive folder structure.
- Upload evidence files to Drive from a server-side route or controlled worker.
- Store Drive file IDs in Supabase.
- Add file permission checks.

## Milestone 4: Backups and Exports

- Export safe tables to Google Sheets.
- Export CSV files to Drive.
- Export SQL dumps to restricted Drive folder.
- Run one restore test before production use.

## Milestone 5: Education Sponsorship

- School nominations.
- Validation checklist.
- CBT readiness.
- Exam registration.
- Check-ins.
- Results and donor summary.

## Milestone 6: Reporting

- Google Docs report templates.
- Generated donor reports.
- Evidence appendix.
- Approval workflow.
