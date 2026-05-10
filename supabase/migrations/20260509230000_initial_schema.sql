create extension if not exists "pgcrypto";

create type app_role as enum (
  'admin',
  'programme_officer',
  'me_lead',
  'volunteer_coordinator',
  'volunteer',
  'viewer'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  programme_code text not null unique,
  name text not null,
  programme_type text not null,
  donor text,
  location text,
  starts_on date,
  ends_on date,
  status text not null default 'draft',
  drive_folder_id text,
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  beneficiary_code text not null unique,
  full_name text not null,
  gender text,
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  community text,
  state text,
  school_name text,
  consent_status text not null default 'not_recorded',
  photo_video_consent text not null default 'not_recorded',
  safeguarding_flag text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
  status text not null default 'active',
  selection_route text,
  approved_by uuid references public.profiles(id),
  enrolled_at timestamptz not null default now(),
  unique (programme_id, beneficiary_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  activity_code text not null unique,
  programme_id uuid not null references public.programmes(id) on delete cascade,
  title text not null,
  activity_type text not null,
  location text,
  scheduled_for timestamptz,
  completed_at timestamptz,
  status text not null default 'planned',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  unique (activity_id, beneficiary_id)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  evidence_code text not null unique,
  programme_id uuid references public.programmes(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  beneficiary_id uuid references public.beneficiaries(id) on delete set null,
  title text not null,
  evidence_type text not null,
  drive_file_id text not null,
  drive_folder_id text,
  mime_type text,
  file_size_bytes bigint,
  checksum text,
  verification_status text not null default 'in_review',
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  module text not null,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.programmes enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.enrolments enable row level security;
alter table public.activities enable row level security;
alter table public.attendance enable row level security;
alter table public.evidence enable row level security;
alter table public.audit_log enable row level security;

-- Policies are intentionally conservative placeholders.
-- Add tested role-specific policies before entering real beneficiary data.
