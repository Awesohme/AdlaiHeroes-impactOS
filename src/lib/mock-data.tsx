import { CalendarCheck, Database, FileText, FolderArchive, HeartHandshake, ShieldCheck, UsersRound } from "@/components/icons";

export const stats = [
  { label: "Active programmes", value: "6", detail: "Across education, health, WASH, and dignity campaigns" },
  { label: "Beneficiaries tracked", value: "428", detail: "One record per person, dedupe required before launch" },
  { label: "Evidence completeness", value: "82%", detail: "Target is 90% before donor report generation" },
  { label: "Backup health", value: "Green", detail: "Drive export and restore test are MVP acceptance criteria" },
];

export const moduleCards = [
  {
    title: "Programmes",
    description: "Create programme records, configure fields, assign owners, and track status from planning to completion.",
    status: "Phase 1",
    icon: <FolderArchive />,
  },
  {
    title: "Beneficiaries",
    description: "Maintain a clean registry with consent, dedupe checks, guardian details, and programme history.",
    status: "Phase 1",
    icon: <UsersRound />,
  },
  {
    title: "Activities",
    description: "Log field activities, attendance, locations, notes, and evidence requirements for each programme.",
    status: "Phase 1",
    icon: <CalendarCheck />,
  },
  {
    title: "Evidence",
    description: "Upload files to Google Drive while Supabase stores metadata, verification status, and Drive file IDs.",
    status: "Phase 1",
    icon: <ShieldCheck />,
  },
  {
    title: "Education Sponsorship",
    description: "Track nominations, readiness validation, CBT orientation, exam registration, check-ins, and results.",
    status: "Phase 2",
    icon: <HeartHandshake />,
  },
  {
    title: "Reports",
    description: "Generate donor-ready reports from structured records, then save Google Docs/PDFs back to Drive.",
    status: "Phase 3",
    icon: <FileText />,
  },
  {
    title: "Backups",
    description: "Export safe tables to Sheets, SQL dumps to Drive, and verify restores before real beneficiary data.",
    status: "Phase 1 gate",
    icon: <Database />,
  },
  {
    title: "Governance",
    description: "Role-based access, safeguarding restrictions, audit logs, and monthly access reviews.",
    status: "Before launch",
    icon: <ShieldCheck />,
  },
];

export const sponsorshipPipeline = [
  { stage: "Nominated", count: 120, percent: 100 },
  { stage: "Validated", count: 84, percent: 70 },
  { stage: "CBT orientation complete", count: 63, percent: 52 },
  { stage: "Registered", count: 48, percent: 40 },
  { stage: "Results uploaded", count: 0, percent: 0 },
];

export const recentEvidence = [
  { id: "EVD-2026-0001", title: "School nomination letters", programme: "Education Sponsorship 2026", status: "Verified" },
  { id: "EVD-2026-0002", title: "CBT readiness attendance", programme: "Education Sponsorship 2026", status: "In review" },
  { id: "EVD-2026-0003", title: "Pad distribution photos", programme: "Girls Dignity Outreach", status: "Needs consent check" },
  { id: "EVD-2026-0004", title: "Food drive receipts", programme: "Community Food Support", status: "Verified" },
];
