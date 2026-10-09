-- QuarantineCare 002: base facility data + auth -> profile sync
-- Run this AFTER 001_initial_schema.sql.
-- Then create the three auth users (see README/startup notes) and run 003_seed_demo.sql.

-- 1. Link user profiles to Supabase Auth identities (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_id_fkey'
  ) then
    alter table public.users
      add constraint users_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 2. Auto-create a public.users profile whenever an auth user is created.
--    Set these keys in the user's metadata when creating them in the dashboard:
--    { "role": "nurse" | "doctor" | "administrator", "full_name": "Full Name" }
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'nurse'),
    true
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for auth users created before the trigger existed.
insert into public.users (id, full_name, email, role, active)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.email),
  au.email,
  coalesce((au.raw_user_meta_data->>'role')::user_role, 'nurse'),
  true
from auth.users au
on conflict (id) do nothing;

-- 74 rooms
insert into public.rooms (room_number, status)
select 'R-' || lpad(g::text, 2, '0'), 'available'
from generate_series(1, 74) g
on conflict (room_number) do nothing;

-- Facility settings (single row)
insert into public.facility_settings (facility_name, maximum_capacity, fever_threshold_celsius, timezone)
select 'QuarantineCare Facility', 74, 38.0, 'Asia/Kolkata'
where not exists (select 1 from public.facility_settings);
