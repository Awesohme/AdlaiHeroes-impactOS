alter table public.programmes
add column if not exists donor_funder text,
add column if not exists location_areas text[] not null default '{}'::text[],
add column if not exists target_group text,
add column if not exists expected_beneficiaries integer,
add column if not exists budget_ngn numeric(14,2),
add column if not exists objectives text,
add column if not exists programme_description text,
add column if not exists start_date date,
add column if not exists end_date date,
add column if not exists enabled_modules text[] not null default '{}'::text[];

create table if not exists public.programme_data_fields (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  required boolean not null default false,
  position integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (programme_id, field_key)
);

alter table public.programme_data_fields enable row level security;
