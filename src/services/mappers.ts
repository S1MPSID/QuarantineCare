import type {
  AuditLog,
  DemoDatabase,
  DischargeRequest,
  DoctorVisit,
  FacilitySettings,
  Patient,
  PatientOutcome,
  Room,
  TemperatureReading,
  User,
} from "@/domain/types";

/** Database row shapes (snake_case, as returned by PostgREST). */
export interface UserRow {
  [key: string]: unknown;
  id: string;
  full_name: string;
  email: string;
  role: User["role"];
  active: boolean;
}

export interface RoomRow {
  [key: string]: unknown;
  id: string;
  room_number: string;
  status: Room["status"];
}

export interface PatientRow {
  [key: string]: unknown;
  id: string;
  patient_code: string;
  full_name: string;
  age: number;
  room_id: string | null;
  admitted_at: string;
  status: Patient["status"];
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemperatureReadingRow {
  [key: string]: unknown;
  id: string;
  patient_id: string;
  temperature_celsius: number;
  observed_at: string;
  facility_local_date: string;
  recorded_by: string;
  notes: string | null;
  correction_of_id: string | null;
  created_at: string;
}

export interface DoctorVisitRow {
  [key: string]: unknown;
  id: string;
  patient_id: string;
  doctor_id: string;
  visited_at: string;
  facility_local_date: string;
  clinical_notes: string;
  treatment_plan: string | null;
  follow_up_instructions: string | null;
  temperature_missing_flag: boolean;
  created_at: string;
}

export interface DischargeRequestRow {
  [key: string]: unknown;
  id: string;
  patient_id: string;
  requested_by: string;
  eligibility_confirmed_by: string;
  eligibility_confirmed_at: string;
  administrative_processed_by: string | null;
  processed_at: string | null;
  status: DischargeRequest["status"];
  notes: string | null;
  fever_free_dates: string[];
  created_at: string;
}

export interface PatientOutcomeRow {
  [key: string]: unknown;
  id: string;
  patient_id: string;
  outcome_type: PatientOutcome["outcomeType"];
  outcome_at: string;
  recorded_by: string;
  notes: string | null;
}

export interface AuditLogRow {
  [key: string]: unknown;
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
  previous_value: string | null;
  new_value: string | null;
}

export interface FacilitySettingsRow {
  [key: string]: unknown;
  id: string;
  facility_name: string;
  maximum_capacity: number;
  fever_threshold_celsius: number;
  timezone: string;
  updated_at: string;
  updated_by: string | null;
}

/* ---------------------------- domain -> row ---------------------------- */

export function userToRow(u: User): UserRow {
  return {
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    active: u.active,
  };
}

export function roomToRow(r: Room): RoomRow {
  return { id: r.id, room_number: r.roomNumber, status: r.status };
}

export function patientToRow(p: Patient): PatientRow {
  return {
    id: p.id,
    patient_code: p.patientCode,
    full_name: p.fullName,
    age: p.age,
    room_id: p.roomId ?? null,
    admitted_at: p.admittedAt,
    status: p.status,
    admin_notes: p.adminNotes ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function readingToRow(r: TemperatureReading): TemperatureReadingRow {
  return {
    id: r.id,
    patient_id: r.patientId,
    temperature_celsius: r.temperatureCelsius,
    observed_at: r.observedAt,
    facility_local_date: r.facilityLocalDate,
    recorded_by: r.recordedBy,
    notes: r.notes ?? null,
    correction_of_id: r.correctionOfId ?? null,
    created_at: r.createdAt,
  };
}

export function visitToRow(v: DoctorVisit): DoctorVisitRow {
  return {
    id: v.id,
    patient_id: v.patientId,
    doctor_id: v.doctorId,
    visited_at: v.visitedAt,
    facility_local_date: v.facilityLocalDate,
    clinical_notes: v.clinicalNotes,
    treatment_plan: v.treatmentPlan ?? null,
    follow_up_instructions: v.followUpInstructions ?? null,
    temperature_missing_flag: v.temperatureMissingFlag,
    created_at: v.createdAt,
  };
}

export function dischargeToRow(d: DischargeRequest): DischargeRequestRow {
  return {
    id: d.id,
    patient_id: d.patientId,
    requested_by: d.requestedBy,
    eligibility_confirmed_by: d.eligibilityConfirmedBy,
    eligibility_confirmed_at: d.eligibilityConfirmedAt,
    administrative_processed_by: d.administrativeProcessedBy ?? null,
    processed_at: d.processedAt ?? null,
    status: d.status,
    notes: d.notes ?? null,
    fever_free_dates: d.feverFreeDates,
    created_at: d.createdAt,
  };
}

export function outcomeToRow(o: PatientOutcome): PatientOutcomeRow {
  return {
    id: o.id,
    patient_id: o.patientId,
    outcome_type: o.outcomeType,
    outcome_at: o.outcomeAt,
    recorded_by: o.recordedBy,
    notes: o.notes ?? null,
  };
}

export function auditToRow(a: AuditLog): AuditLogRow {
  return {
    id: a.id,
    actor_id: a.actorId,
    entity_type: a.entityType,
    entity_id: a.entityId,
    action: a.action,
    timestamp: a.timestamp,
    previous_value: a.previousValue ?? null,
    new_value: a.newValue ?? null,
  };
}

export function settingsToRow(s: FacilitySettings): FacilitySettingsRow {
  return {
    id: s.id,
    facility_name: s.facilityName,
    maximum_capacity: s.maximumCapacity,
    fever_threshold_celsius: s.feverThresholdCelsius,
    timezone: s.timezone,
    updated_at: s.updatedAt,
    updated_by: s.updatedBy ?? null,
  };
}

/* ---------------------------- row -> domain ---------------------------- */

export function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    role: r.role,
    active: r.active,
  };
}

export function rowToRoom(r: RoomRow): Room {
  return { id: r.id, roomNumber: r.room_number, status: r.status };
}

export function rowToPatient(r: PatientRow): Patient {
  return {
    id: r.id,
    patientCode: r.patient_code,
    fullName: r.full_name,
    age: r.age,
    roomId: r.room_id ?? "",
    admittedAt: r.admitted_at,
    status: r.status,
    adminNotes: r.admin_notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToReading(r: TemperatureReadingRow): TemperatureReading {
  return {
    id: r.id,
    patientId: r.patient_id,
    temperatureCelsius: Number(r.temperature_celsius),
    observedAt: r.observed_at,
    facilityLocalDate: r.facility_local_date,
    recordedBy: r.recorded_by,
    notes: r.notes ?? undefined,
    correctionOfId: r.correction_of_id,
    createdAt: r.created_at,
  };
}

export function rowToVisit(r: DoctorVisitRow): DoctorVisit {
  return {
    id: r.id,
    patientId: r.patient_id,
    doctorId: r.doctor_id,
    visitedAt: r.visited_at,
    facilityLocalDate: r.facility_local_date,
    clinicalNotes: r.clinical_notes,
    treatmentPlan: r.treatment_plan ?? undefined,
    followUpInstructions: r.follow_up_instructions ?? undefined,
    temperatureMissingFlag: r.temperature_missing_flag,
    createdAt: r.created_at,
  };
}

export function rowToDischarge(r: DischargeRequestRow): DischargeRequest {
  return {
    id: r.id,
    patientId: r.patient_id,
    requestedBy: r.requested_by,
    eligibilityConfirmedBy: r.eligibility_confirmed_by,
    eligibilityConfirmedAt: r.eligibility_confirmed_at,
    administrativeProcessedBy: r.administrative_processed_by ?? undefined,
    processedAt: r.processed_at ?? undefined,
    status: r.status,
    notes: r.notes ?? undefined,
    feverFreeDates: r.fever_free_dates ?? [],
    createdAt: r.created_at,
  };
}

export function rowToOutcome(r: PatientOutcomeRow): PatientOutcome {
  return {
    id: r.id,
    patientId: r.patient_id,
    outcomeType: r.outcome_type,
    outcomeAt: r.outcome_at,
    recordedBy: r.recorded_by,
    notes: r.notes ?? undefined,
  };
}

export function rowToAudit(r: AuditLogRow): AuditLog {
  return {
    id: r.id,
    actorId: r.actor_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    timestamp: r.timestamp,
    previousValue: r.previous_value ?? undefined,
    newValue: r.new_value ?? undefined,
  };
}

export function rowToSettings(r: FacilitySettingsRow): FacilitySettings {
  return {
    id: r.id,
    facilityName: r.facility_name,
    maximumCapacity: r.maximum_capacity,
    feverThresholdCelsius: Number(r.fever_threshold_celsius),
    timezone: r.timezone,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by ?? undefined,
  };
}

export interface SupabaseDataset {
  users: UserRow[];
  rooms: RoomRow[];
  patients: PatientRow[];
  temperatureReadings: TemperatureReadingRow[];
  doctorVisits: DoctorVisitRow[];
  dischargeRequests: DischargeRequestRow[];
  patientOutcomes: PatientOutcomeRow[];
  auditLogs: AuditLogRow[];
  facilitySettings: FacilitySettingsRow | null;
}

export function datasetToDomain(d: SupabaseDataset): DemoDatabase {
  return {
    users: d.users.map(rowToUser),
    rooms: d.rooms.map(rowToRoom),
    patients: d.patients.map(rowToPatient),
    temperatureReadings: d.temperatureReadings.map(rowToReading),
    doctorVisits: d.doctorVisits.map(rowToVisit),
    dischargeRequests: d.dischargeRequests.map(rowToDischarge),
    patientOutcomes: d.patientOutcomes.map(rowToOutcome),
    auditLogs: d.auditLogs.map(rowToAudit),
    facilitySettings: d.facilitySettings
      ? rowToSettings(d.facilitySettings)
      : defaultSettings(),
  };
}

export function defaultSettings(): FacilitySettings {
  return {
    id: "settings-1",
    facilityName: "QuarantineCare Facility",
    maximumCapacity: 74,
    feverThresholdCelsius: 38.0,
    timezone: "Asia/Kolkata",
    updatedAt: new Date().toISOString(),
  };
}
