begin;

alter table if exists public.programmes
  add column if not exists pipeline_template_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programmes_pipeline_template_key_check'
  ) then
    alter table public.programmes
      add constraint programmes_pipeline_template_key_check
      check (
        pipeline_template_key is null
        or pipeline_template_key in ('education_sponsorship')
      );
  end if;
end $$;

with education_template_programmes as (
  select programme_id
  from public.programme_stages
  group by programme_id
  having array_agg(key order by position) = array[
    'nominated',
    'validated',
    'approved',
    'deferred',
    'in_prep',
    'exam',
    'completed',
    'declined'
  ]::text[]
)
update public.programmes
set pipeline_template_key = 'education_sponsorship'
where id in (select programme_id from education_template_programmes);

delete from public.enrolment_scorecards scorecards
using public.enrolments enrolments
join public.programmes programmes on programmes.id = enrolments.programme_id
where scorecards.enrolment_id = enrolments.id
  and coalesce(programmes.pipeline_template_key, '') <> 'education_sponsorship';

commit;
