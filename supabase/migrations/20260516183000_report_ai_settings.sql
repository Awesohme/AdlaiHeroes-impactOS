begin;

create table if not exists public.ai_settings (
  setting_key text primary key,
  enabled boolean not null default false,
  endpoint text,
  model text,
  api_key_ciphertext text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ai_settings enable row level security;

drop policy if exists ai_settings_admin_read on public.ai_settings;
drop policy if exists ai_settings_admin_write on public.ai_settings;
drop policy if exists ai_settings_admin_delete on public.ai_settings;

create policy ai_settings_admin_read
on public.ai_settings
for select
to authenticated
using (public.current_app_role() = 'admin');

create policy ai_settings_admin_write
on public.ai_settings
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

commit;
