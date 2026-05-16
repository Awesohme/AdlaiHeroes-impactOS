begin;

create table if not exists public.programme_notes (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  category text not null,
  body text not null,
  include_in_report boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists programme_notes_programme_id_created_at_idx
  on public.programme_notes(programme_id, created_at desc);

alter table public.programme_notes enable row level security;

drop policy if exists programme_notes_ops_read on public.programme_notes;
drop policy if exists programme_notes_ops_insert on public.programme_notes;
drop policy if exists programme_notes_ops_update on public.programme_notes;
drop policy if exists programme_notes_ops_delete on public.programme_notes;

create policy programme_notes_ops_read
on public.programme_notes
for select
to authenticated
using (public.current_app_can_manage_ops());

create policy programme_notes_ops_insert
on public.programme_notes
for insert
to authenticated
with check (public.current_app_can_manage_ops());

create policy programme_notes_ops_update
on public.programme_notes
for update
to authenticated
using (public.current_app_can_manage_ops())
with check (public.current_app_can_manage_ops());

create policy programme_notes_ops_delete
on public.programme_notes
for delete
to authenticated
using (public.current_app_can_manage_ops());

create table if not exists public.programme_reports (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  report_type text not null,
  status text not null default 'draft',
  title text not null,
  content_snapshot text not null,
  context_snapshot jsonb not null default '{}'::jsonb,
  drive_file_id text,
  drive_web_link text,
  document_format text not null default 'google_doc',
  generated_with_ai boolean not null default false,
  generation_error text,
  generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists programme_reports_programme_id_updated_at_idx
  on public.programme_reports(programme_id, updated_at desc);

alter table public.programme_reports enable row level security;

drop policy if exists programme_reports_ops_read on public.programme_reports;
drop policy if exists programme_reports_ops_insert on public.programme_reports;
drop policy if exists programme_reports_ops_update on public.programme_reports;
drop policy if exists programme_reports_ops_delete on public.programme_reports;

create policy programme_reports_ops_read
on public.programme_reports
for select
to authenticated
using (public.current_app_can_manage_ops());

create policy programme_reports_ops_insert
on public.programme_reports
for insert
to authenticated
with check (public.current_app_can_manage_ops());

create policy programme_reports_ops_update
on public.programme_reports
for update
to authenticated
using (public.current_app_can_manage_ops())
with check (public.current_app_can_manage_ops());

create policy programme_reports_ops_delete
on public.programme_reports
for delete
to authenticated
using (public.current_app_can_manage_ops());

commit;
