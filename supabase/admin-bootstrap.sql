begin;

-- 1. Remove temporary public/demo access.
drop policy if exists "dev_read_programmes" on public.programmes;

-- 2. Bootstrap the first admin profile after the user has signed in once with Google.
insert into public.profiles (
  id,
  full_name,
  email,
  role,
  is_active
)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  ) as full_name,
  u.email,
  'admin'::public.app_role,
  true
from auth.users u
where lower(u.email) = lower('adlaioog@gmail.com')
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  role = 'admin'::public.app_role,
  is_active = true;

-- 3. Replace role helper with an explicit app helper.
drop function if exists public.current_app_role();

create function public.current_app_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

-- 4. Profiles: users can read themselves, admins can read all profiles.
drop policy if exists "profiles_read_own" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() = 'admin'::public.app_role
);

-- 5. Programmes: only active profiled users can read.
drop policy if exists "programmes_read_authenticated_active" on public.programmes;

create policy "programmes_read_authenticated_active"
on public.programmes
for select
to authenticated
using (
  public.current_app_role() is not null
);

-- 6. Keep sensitive/operational tables admin-read only until role workflows are tested.
drop policy if exists "beneficiaries_admin_read" on public.beneficiaries;
drop policy if exists "enrolments_admin_read" on public.enrolments;
drop policy if exists "activities_admin_read" on public.activities;
drop policy if exists "attendance_admin_read" on public.attendance;
drop policy if exists "evidence_admin_read" on public.evidence;
drop policy if exists "audit_log_admin_read" on public.audit_log;

create policy "beneficiaries_admin_read"
on public.beneficiaries
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

create policy "enrolments_admin_read"
on public.enrolments
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

create policy "activities_admin_read"
on public.activities
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

create policy "attendance_admin_read"
on public.attendance
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

create policy "evidence_admin_read"
on public.evidence
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

create policy "audit_log_admin_read"
on public.audit_log
for select
to authenticated
using (public.current_app_role() = 'admin'::public.app_role);

commit;
