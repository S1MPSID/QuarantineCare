-- QuarantineCare initial schema (apply via Supabase SQL editor or CLI).
-- Idempotent: safe to re-run if it was previously applied partially.

do $$ begin
  create type user_role as enum ('nurse', 'doctor', 'administrator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type patient_status as enum ('admitted', 'discharged', 'deceased');
exception when duplicate_object then null; end $$;

do $$ begin
  create type room_status as enum ('available', 'occupied');
exception when duplicate_object then null; end $$;

do $$ begin
  create type discharge_request_status as enum ('awaiting_administration', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type outcome_type as enum ('recovered', 'death');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  role user_role not null,
  active boolean not null default true
);

create table if not exists facility_settings (
  id uuid primary key default gen_random_uuid(),
  facility_name text not null,
  maximum_capacity int not null default 74 check (maximum_capacity > 0),
  fever_threshold_celsius numeric(4,1) not null default 38.0,
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text unique not null,
  status room_status not null default 'available'
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique not null,
  full_name text not null,
  age int not null check (age > 0),
  room_id uuid references rooms(id),
  admitted_at timestamptz not null,
  status patient_status not null default 'admitted',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_patient_per_room on patients (room_id)
  where (status = 'admitted');

create table if not exists temperature_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  temperature_celsius numeric(4,1) not null,
  observed_at timestamptz not null,
  facility_local_date date not null,
  recorded_by uuid not null references users(id),
  notes text,
  correction_of_id uuid references temperature_readings(id),
  created_at timestamptz not null default now()
);

create unique index if not exists one_routine_temp_per_patient_day on temperature_readings (patient_id, facility_local_date)
  where (correction_of_id is null);

create table if not exists doctor_visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references users(id),
  visited_at timestamptz not null,
  facility_local_date date not null,
  clinical_notes text not null,
  treatment_plan text,
  follow_up_instructions text,
  temperature_missing_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (patient_id, facility_local_date)
);

create table if not exists discharge_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  requested_by uuid not null references users(id),
  eligibility_confirmed_by uuid not null references users(id),
  eligibility_confirmed_at timestamptz not null,
  administrative_processed_by uuid references users(id),
  processed_at timestamptz,
  status discharge_request_status not null,
  notes text,
  fever_free_dates date[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists patient_outcomes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  outcome_type outcome_type not null,
  outcome_at timestamptz not null,
  recorded_by uuid not null references users(id),
  notes text
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  timestamp timestamptz not null default now(),
  previous_value text,
  new_value text
);
