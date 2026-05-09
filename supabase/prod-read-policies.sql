-- Production-readiness policy step.
-- Run only after Google OAuth is configured and at least one admin profile exists.

drop policy if exists "dev_read_programmes" on public.programmes;

create or replace function public.current_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "programmes_read_authenticated_active" on public.programmes;
create policy "programmes_read_authenticated_active"
on public.programmes
for select
to authenticated
using (public.current_role() is not null);

-- Write policies come after protected reads are verified in the deployed app.
