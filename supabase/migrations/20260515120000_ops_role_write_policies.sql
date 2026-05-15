begin;

create or replace function public.current_app_role()
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

create or replace function public.current_app_can_manage_ops()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_app_role() in (
    'admin'::public.app_role,
    'programme_officer'::public.app_role,
    'me_lead'::public.app_role
  )
$$;

revoke all on function public.current_app_can_manage_ops() from public;
grant execute on function public.current_app_can_manage_ops() to authenticated;

do $$
begin
  if to_regclass('public.beneficiaries') is not null then
    drop policy if exists beneficiaries_admin_read on public.beneficiaries;
    drop policy if exists beneficiaries_ops_read on public.beneficiaries;
    drop policy if exists beneficiaries_admin_insert on public.beneficiaries;
    drop policy if exists beneficiaries_ops_insert on public.beneficiaries;
    drop policy if exists beneficiaries_admin_update on public.beneficiaries;
    drop policy if exists beneficiaries_ops_update on public.beneficiaries;

    create policy beneficiaries_ops_read
    on public.beneficiaries
    for select
    to authenticated
    using (public.current_app_can_manage_ops());

    create policy beneficiaries_ops_insert
    on public.beneficiaries
    for insert
    to authenticated
    with check (public.current_app_can_manage_ops());

    create policy beneficiaries_ops_update
    on public.beneficiaries
    for update
    to authenticated
    using (public.current_app_can_manage_ops())
    with check (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.enrolments') is not null then
    drop policy if exists enrolments_admin_read on public.enrolments;
    drop policy if exists enrolments_ops_read on public.enrolments;
    drop policy if exists enrolments_admin_insert on public.enrolments;
    drop policy if exists enrolments_ops_insert on public.enrolments;
    drop policy if exists enrolments_admin_update on public.enrolments;
    drop policy if exists enrolments_ops_update on public.enrolments;

    create policy enrolments_ops_read
    on public.enrolments
    for select
    to authenticated
    using (public.current_app_can_manage_ops());

    create policy enrolments_ops_insert
    on public.enrolments
    for insert
    to authenticated
    with check (public.current_app_can_manage_ops());

    create policy enrolments_ops_update
    on public.enrolments
    for update
    to authenticated
    using (public.current_app_can_manage_ops())
    with check (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.evidence') is not null then
    drop policy if exists evidence_admin_read on public.evidence;
    drop policy if exists evidence_ops_read on public.evidence;
    drop policy if exists evidence_insert_admin_only on public.evidence;
    drop policy if exists evidence_ops_insert on public.evidence;
    drop policy if exists evidence_update_admin_only on public.evidence;
    drop policy if exists evidence_ops_update on public.evidence;

    create policy evidence_ops_read
    on public.evidence
    for select
    to authenticated
    using (public.current_app_can_manage_ops());

    create policy evidence_ops_insert
    on public.evidence
    for insert
    to authenticated
    with check (
      public.current_app_can_manage_ops()
      and (uploaded_by is null or uploaded_by = auth.uid())
    );

    create policy evidence_ops_update
    on public.evidence
    for update
    to authenticated
    using (public.current_app_can_manage_ops())
    with check (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.activities') is not null then
    drop policy if exists activities_admin_read on public.activities;
    drop policy if exists activities_ops_read on public.activities;
    drop policy if exists activities_ops_insert on public.activities;
    drop policy if exists activities_ops_update on public.activities;

    create policy activities_ops_read
    on public.activities
    for select
    to authenticated
    using (public.current_app_can_manage_ops());

    create policy activities_ops_insert
    on public.activities
    for insert
    to authenticated
    with check (public.current_app_can_manage_ops());

    create policy activities_ops_update
    on public.activities
    for update
    to authenticated
    using (public.current_app_can_manage_ops())
    with check (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.attendance') is not null then
    drop policy if exists attendance_admin_read on public.attendance;
    drop policy if exists attendance_ops_read on public.attendance;
    drop policy if exists attendance_ops_insert on public.attendance;
    drop policy if exists attendance_ops_update on public.attendance;

    create policy attendance_ops_read
    on public.attendance
    for select
    to authenticated
    using (public.current_app_can_manage_ops());

    create policy attendance_ops_insert
    on public.attendance
    for insert
    to authenticated
    with check (public.current_app_can_manage_ops());

    create policy attendance_ops_update
    on public.attendance
    for update
    to authenticated
    using (public.current_app_can_manage_ops())
    with check (public.current_app_can_manage_ops());
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'beneficiary_notes',
    'evidence_notes',
    'programme_funds',
    'programme_milestones',
    'programme_stages',
    'enrolment_scorecards',
    'enrolment_field_values'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I', table_name || '_ops_read', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_ops_insert', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_ops_update', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_ops_delete', table_name);

      execute format(
        'create policy %I on public.%I for select to authenticated using (public.current_app_can_manage_ops())',
        table_name || '_ops_read',
        table_name
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.current_app_can_manage_ops())',
        table_name || '_ops_insert',
        table_name
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (public.current_app_can_manage_ops()) with check (public.current_app_can_manage_ops())',
        table_name || '_ops_update',
        table_name
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.current_app_can_manage_ops())',
        table_name || '_ops_delete',
        table_name
      );
    end if;
  end loop;
end $$;

delete from public.field_templates
where field_key = 'school_name';

commit;
