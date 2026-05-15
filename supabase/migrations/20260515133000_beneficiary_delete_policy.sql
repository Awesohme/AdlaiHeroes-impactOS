begin;

do $$
begin
  if to_regclass('public.beneficiaries') is not null then
    drop policy if exists beneficiaries_ops_delete on public.beneficiaries;

    create policy beneficiaries_ops_delete
    on public.beneficiaries
    for delete
    to authenticated
    using (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.enrolments') is not null then
    drop policy if exists enrolments_ops_delete on public.enrolments;

    create policy enrolments_ops_delete
    on public.enrolments
    for delete
    to authenticated
    using (public.current_app_can_manage_ops());
  end if;

  if to_regclass('public.attendance') is not null then
    drop policy if exists attendance_ops_delete on public.attendance;

    create policy attendance_ops_delete
    on public.attendance
    for delete
    to authenticated
    using (public.current_app_can_manage_ops());
  end if;
end $$;

commit;
