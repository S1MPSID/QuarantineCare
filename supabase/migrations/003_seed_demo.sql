-- QuarantineCare synthetic demo dataset.
-- Run AFTER 001_initial_schema.sql, 002_seed_base.sql, AND after creating the
-- nurse / doctor / administrator auth users (so profiles + roles exist).

do $$
declare
  v_nurse uuid;
  v_doctor uuid;
  v_admin uuid;
  v_id uuid;
  i int;
begin
  if exists (select 1 from public.patients limit 1) then
    raise notice 'Patients already exist; skipping demo seed.';
    return;
  end if;

  select id into v_nurse  from public.users where role = 'nurse'          order by email limit 1;
  select id into v_doctor from public.users where role = 'doctor'         order by email limit 1;
  select id into v_admin  from public.users where role = 'administrator'  order by email limit 1;

  if v_nurse is null or v_doctor is null or v_admin is null then
    raise exception 'Create nurse / doctor / administrator auth users (with role metadata) before seeding demo data.';
  end if;

  -- ---------------------------------------------------------------- patients
  -- Featured admitted patients with distinct scenarios.
  insert into public.patients (patient_code, full_name, age, room_id, admitted_at, status, admin_notes)
  select v.code, v.name, v.age, r.id, now() - make_interval(days => v.days), 'admitted', v.notes
  from (values
    ('QC-DEMO-0001','Ravi Kumar',41,'R-01',5,'Synthetic demo record.'),
    ('QC-DEMO-0002','Sneha Patel',34,'R-02',5,'Synthetic demo record - discharge candidate.'),
    ('QC-DEMO-0003','Mohammed Ali',58,'R-03',4,null),
    ('QC-DEMO-0004','Lakshmi Iyer',29,'R-04',4,null),
    ('QC-DEMO-0005','Vikram Singh',46,'R-05',6,'Doctor-confirmed, awaiting administration.')
  ) as v(code,name,age,room_number,days,notes)
  join public.rooms r on r.room_number = v.room_number;

  -- Generic admitted census (QC-DEMO-0006 .. QC-DEMO-0020).
  for i in 6..20 loop
    insert into public.patients (patient_code, full_name, age, room_id, admitted_at, status)
    values (
      'QC-DEMO-' || lpad(i::text, 4, '0'),
      'Synthetic Patient ' || i || ' (Demo)',
      25 + (i % 40),
      (select id from public.rooms where room_number = 'R-' || lpad(i::text, 2, '0')),
      now() - make_interval(days => 2 + (i % 7)),
      'admitted'
    )
    returning id into v_id;

    if i % 4 <> 0 then
      insert into public.temperature_readings
        (patient_id, temperature_celsius, observed_at, facility_local_date, recorded_by)
      values
        (v_id, 36.5 + (i % 5) * 0.2, now(),
         (now() at time zone 'Asia/Kolkata')::date, v_nurse);
    end if;

    if i % 3 = 0 then
      insert into public.temperature_readings
        (patient_id, temperature_celsius, observed_at, facility_local_date, recorded_by)
      values
        (v_id, 37.0, now() - interval '1 day',
         ((now() - interval '1 day') at time zone 'Asia/Kolkata')::date, v_nurse);
    end if;
  end loop;

  -- Historical recovered / discharged survivors.
  insert into public.patients (patient_code, full_name, age, room_id, admitted_at, status, admin_notes, updated_at)
  select v.code, v.name, v.age, r.id, now() - make_interval(days => v.days),
         'discharged', 'Synthetic: completed administrative discharge.', now() - interval '1 day'
  from (values
    ('QC-DEMO-9001','Harish Nambiar',54,'R-71',14),
    ('QC-DEMO-9002','Sunita Rao',62,'R-72',16),
    ('QC-DEMO-9003','Arun Das',38,'R-73',13),
    ('QC-DEMO-9004','Kavya Nair',45,'R-74',15)
  ) as v(code,name,age,room_number,days)
  join public.rooms r on r.room_number = v.room_number;

  -- Deceased patient (recorded outcome, not a discharge).
  insert into public.patients (patient_code, full_name, age, room_id, admitted_at, status, admin_notes, updated_at)
  values (
    'QC-DEMO-9050','Geeta Krishnan',67,
    (select id from public.rooms where room_number = 'R-70'),
    now() - interval '10 days', 'deceased', 'Synthetic outcome record.', now() - interval '3 days'
  );

  -- -------------------------------------------------------------- readings
  -- Featured temperature history (drives fever, streak, and candidate demos).
  insert into public.temperature_readings
    (patient_id, temperature_celsius, observed_at, facility_local_date, recorded_by, notes)
  select p.id, v.temp, now() - make_interval(days => v.days_ago),
         ((now() - make_interval(days => v.days_ago)) at time zone 'Asia/Kolkata')::date,
         v_nurse, v.notes
  from (values
    ('QC-DEMO-0001', 3, 37.2, null),
    ('QC-DEMO-0001', 2, 37.5, null),
    ('QC-DEMO-0001', 1, 37.1, null),
    ('QC-DEMO-0001', 0, 38.6, 'Elevated - flag for clinical review'),
    ('QC-DEMO-0002', 4, 37.8, null),
    ('QC-DEMO-0002', 3, 37.2, null),
    ('QC-DEMO-0002', 2, 36.9, null),
    ('QC-DEMO-0002', 1, 37.0, null),
    ('QC-DEMO-0002', 0, 36.8, null),
    ('QC-DEMO-0003', 2, 37.1, null),
    ('QC-DEMO-0003', 1, 37.0, null),
    ('QC-DEMO-0004', 3, 36.9, null),
    ('QC-DEMO-0004', 2, 37.0, null),
    ('QC-DEMO-0004', 1, 38.2, 'Fever recorded'),
    ('QC-DEMO-0004', 0, 37.1, null),
    ('QC-DEMO-0005', 4, 36.7, null),
    ('QC-DEMO-0005', 3, 36.8, null),
    ('QC-DEMO-0005', 2, 36.8, null),
    ('QC-DEMO-0005', 1, 36.9, null),
    ('QC-DEMO-0005', 0, 36.9, null)
  ) as v(code, days_ago, temp, notes)
  join public.patients p on p.patient_code = v.code;

  -- ---------------------------------------------------------- doctor visits
  insert into public.doctor_visits
    (patient_id, doctor_id, visited_at, facility_local_date, clinical_notes,
     treatment_plan, follow_up_instructions, temperature_missing_flag)
  select
    p.id, v_doctor, now(), (now() at time zone 'Asia/Kolkata')::date,
    'Synthetic daily review. Stable vitals per nursing record.',
    'Continue supportive care.',
    'Monitor temperature Q8H.',
    (p.patient_code = 'QC-DEMO-0003')
  from public.patients p
  where p.status = 'admitted'
    and (
      p.patient_code in ('QC-DEMO-0001','QC-DEMO-0003','QC-DEMO-0005')
      or (right(p.patient_code, 2)::int % 3 = 0)
    );

  -- ------------------------------------------------------- discharge records
  -- Completed discharges for the survivors.
  insert into public.discharge_requests
    (patient_id, requested_by, eligibility_confirmed_by, eligibility_confirmed_at,
     administrative_processed_by, processed_at, status, notes)
  select p.id, v_doctor, v_doctor, now() - interval '2 days',
         v_admin, now() - interval '1 day', 'completed',
         'Synthetic historical discharge.'
  from public.patients p
  where p.patient_code in ('QC-DEMO-9001','QC-DEMO-9002','QC-DEMO-9003','QC-DEMO-9004');

  -- Doctor-confirmed request awaiting administrative processing (Vikram Singh).
  insert into public.discharge_requests
    (patient_id, requested_by, eligibility_confirmed_by, eligibility_confirmed_at,
     status, notes, fever_free_dates)
  select p.id, v_doctor, v_doctor, now(), 'awaiting_administration',
         'Synthetic: clinically cleared for discharge.',
         array[
           (now() at time zone 'Asia/Kolkata')::date,
           ((now() - interval '1 day') at time zone 'Asia/Kolkata')::date,
           ((now() - interval '2 days') at time zone 'Asia/Kolkata')::date
         ]
  from public.patients p
  where p.patient_code = 'QC-DEMO-0005';

  -- ---------------------------------------------------------------- outcomes
  insert into public.patient_outcomes (patient_id, outcome_type, outcome_at, recorded_by, notes)
  select p.id, 'death', now() - interval '3 days', v_admin,
         'Synthetic outcome for analytics demonstration.'
  from public.patients p
  where p.patient_code = 'QC-DEMO-9050';

  -- Reflect occupied rooms.
  update public.rooms
  set status = 'occupied'
  where id in (select room_id from public.patients where status = 'admitted');

  -- ---------------------------------------------------------------- audit log
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, new_value)
  values (v_admin, 'FacilitySettings', (select id from public.facility_settings limit 1),
          'seed', 'Initial synthetic demo dataset loaded.');
end $$;
