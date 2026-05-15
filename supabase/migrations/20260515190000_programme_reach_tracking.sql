begin;

alter table if exists public.programmes
  add column if not exists reach_tracking_mode text,
  add column if not exists reach_unit_label text,
  add column if not exists target_reach_count integer,
  add column if not exists manual_actual_reach_count integer;

update public.programmes
set
  reach_tracking_mode = coalesce(nullif(reach_tracking_mode, ''), 'beneficiary_registry'),
  reach_unit_label = coalesce(nullif(reach_unit_label, ''), 'beneficiaries'),
  target_reach_count = coalesce(target_reach_count, expected_beneficiaries)
where true;

alter table if exists public.programmes
  alter column reach_tracking_mode set default 'beneficiary_registry',
  alter column reach_unit_label set default 'beneficiaries';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programmes_reach_tracking_mode_check'
  ) then
    alter table public.programmes
      add constraint programmes_reach_tracking_mode_check
      check (reach_tracking_mode in ('beneficiary_registry', 'manual'));
  end if;
end $$;

commit;
