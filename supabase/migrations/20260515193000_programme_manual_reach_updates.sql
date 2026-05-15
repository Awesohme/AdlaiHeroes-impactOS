begin;

create table if not exists public.programme_reach_updates (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  previous_actual_count integer,
  new_actual_count integer not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists programme_reach_updates_programme_id_created_at_idx
  on public.programme_reach_updates(programme_id, created_at desc);

alter table public.programme_reach_updates enable row level security;

drop policy if exists programme_reach_updates_ops_read on public.programme_reach_updates;
drop policy if exists programme_reach_updates_ops_insert on public.programme_reach_updates;
drop policy if exists programme_reach_updates_ops_update on public.programme_reach_updates;
drop policy if exists programme_reach_updates_ops_delete on public.programme_reach_updates;

create policy programme_reach_updates_ops_read
on public.programme_reach_updates
for select
to authenticated
using (public.current_app_can_manage_ops());

create policy programme_reach_updates_ops_insert
on public.programme_reach_updates
for insert
to authenticated
with check (public.current_app_can_manage_ops());

create policy programme_reach_updates_ops_update
on public.programme_reach_updates
for update
to authenticated
using (public.current_app_can_manage_ops())
with check (public.current_app_can_manage_ops());

create policy programme_reach_updates_ops_delete
on public.programme_reach_updates
for delete
to authenticated
using (public.current_app_can_manage_ops());

commit;
