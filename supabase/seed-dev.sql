-- Development seed for Adlai ImpactOps.
-- Run in Supabase SQL Editor after the initial schema.
-- This creates demo records only. Do not use real beneficiary data yet.

insert into public.programmes (
  programme_code,
  name,
  programme_type,
  donor,
  location,
  starts_on,
  ends_on,
  status
)
values
  (
    'PRG-2026-0001',
    'Education Sponsorship 2026',
    'Education Support',
    'ACE Foundation',
    'Lagos',
    '2026-05-01',
    '2026-12-31',
    'active'
  ),
  (
    'PRG-2026-0002',
    'Girls Dignity Outreach',
    'Health & WASH',
    'Adlai Heroes Foundation',
    'Lagos',
    '2026-06-01',
    '2026-08-31',
    'monitoring'
  )
on conflict (programme_code) do update
set
  name = excluded.name,
  programme_type = excluded.programme_type,
  donor = excluded.donor,
  location = excluded.location,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  status = excluded.status,
  updated_at = now();

-- Temporary development policy so the frontend can read programme rows.
-- Replace with authenticated role-aware policies before real data entry.
drop policy if exists "dev_read_programmes" on public.programmes;

create policy "dev_read_programmes"
on public.programmes
for select
to anon, authenticated
using (true);
