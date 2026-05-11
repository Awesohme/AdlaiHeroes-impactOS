alter table public.programmes
add column if not exists archived_at timestamptz,
add column if not exists archived_by uuid references public.profiles(id),
add column if not exists archive_reason text;

create table if not exists public.programme_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.programme_types enable row level security;

insert into public.programme_types (name, position)
values
  ('Education Support', 0),
  ('Health & WASH', 1),
  ('Youth Development', 2),
  ('Livelihoods', 3),
  ('Protection', 4),
  ('Food Support', 5)
on conflict (name) do nothing;

drop policy if exists "programme_types_read_authenticated" on public.programme_types;
create policy "programme_types_read_authenticated"
on public.programme_types
for select
to authenticated
using (true);

drop policy if exists "programme_types_admin_insert" on public.programme_types;
create policy "programme_types_admin_insert"
on public.programme_types
for insert
to authenticated
with check (public.current_app_role() = 'admin');

drop policy if exists "programme_types_admin_update" on public.programme_types;
create policy "programme_types_admin_update"
on public.programme_types
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "programme_types_admin_delete" on public.programme_types;
create policy "programme_types_admin_delete"
on public.programme_types
for delete
to authenticated
using (public.current_app_role() = 'admin');
