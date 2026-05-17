begin;

alter table public.programme_reports
  add column if not exists report_period_label text,
  add column if not exists audience_label text,
  add column if not exists include_evidence_appendix boolean not null default false,
  add column if not exists final_export_file_id text,
  add column if not exists final_export_web_link text,
  add column if not exists final_export_format text;

commit;
