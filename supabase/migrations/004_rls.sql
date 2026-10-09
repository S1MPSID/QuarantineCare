-- QuarantineCare Row Level Security.
-- Run after the schema + seed migrations. Access is enforced server-side:
--   nurse          -> temperature_readings
--   doctor         -> doctor_visits, discharge_requests (clinical confirmation)
--   administrator  -> patients, rooms, outcomes, settings, discharge processing
-- All authenticated users may read operational data for this single facility.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and active = true;
$$;

alter table public.users                enable row level security;
alter table public.rooms                enable row level security;
alter table public.patients             enable row level security;
alter table public.temperature_readings enable row level security;
alter table public.doctor_visits        enable row level security;
alter table public.discharge_requests   enable row level security;
alter table public.patient_outcomes     enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.facility_settings    enable row level security;

-- Read access for every signed-in facility member.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users','rooms','patients','temperature_readings','doctor_visits',
    'discharge_requests','patient_outcomes','audit_logs','facility_settings'
  ] loop
    execute format('drop policy if exists "read_authenticated" on public.%I', t);
    execute format(
      'create policy "read_authenticated" on public.%I for select to authenticated using (true)',
      t
    );
  end loop;
end $$;

-- Role-scoped writes.
drop policy if exists "patients_admin_write" on public.patients;
create policy "patients_admin_write" on public.patients
  for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

drop policy if exists "rooms_admin_write" on public.rooms;
create policy "rooms_admin_write" on public.rooms
  for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

drop policy if exists "settings_admin_write" on public.facility_settings;
create policy "settings_admin_write" on public.facility_settings
  for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

drop policy if exists "outcomes_admin_write" on public.patient_outcomes;
create policy "outcomes_admin_write" on public.patient_outcomes
  for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

drop policy if exists "users_admin_write" on public.users;
create policy "users_admin_write" on public.users
  for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

drop policy if exists "temperature_nurse_write" on public.temperature_readings;
create policy "temperature_nurse_write" on public.temperature_readings
  for all to authenticated
  using (public.current_user_role() = 'nurse')
  with check (public.current_user_role() = 'nurse');

drop policy if exists "visits_doctor_write" on public.doctor_visits;
create policy "visits_doctor_write" on public.doctor_visits
  for all to authenticated
  using (public.current_user_role() = 'doctor')
  with check (public.current_user_role() = 'doctor');

drop policy if exists "discharge_clinical_write" on public.discharge_requests;
create policy "discharge_clinical_write" on public.discharge_requests
  for all to authenticated
  using (public.current_user_role() in ('doctor', 'administrator'))
  with check (public.current_user_role() in ('doctor', 'administrator'));

-- Any authenticated actor may append audit entries (never edit/delete them).
drop policy if exists "audit_insert_authenticated" on public.audit_logs;
create policy "audit_insert_authenticated" on public.audit_logs
  for insert to authenticated
  with check (true);
