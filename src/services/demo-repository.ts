import { computeAnalytics } from "@/domain/analytics";
import { computeDashboardMetrics } from "@/domain/dashboard";
import { todayFacilityDate, toFacilityLocalDate } from "@/domain/dates";
import {
  canCompleteAdminDischarge,
  canConfirmDischarge,
  canCorrectTemperature,
  canRecordDeath,
  canRecordDoctorVisit,
  canRecordTemperature,
  canRegisterPatient,
  canUpdateSettings,
} from "@/domain/permissions";
import {
  calculateFeverFreeStreak,
  hasRoutineReadingForDate,
  validateTemperature,
} from "@/domain/temperature";
import type {
  DashboardMetrics,
  DemoDatabase,
  DischargeRequest,
  DoctorVisit,
  Patient,
  ServiceResult,
  TemperatureReading,
  User,
  UserRole,
} from "@/domain/types";
import { createId } from "./id";
import { loadDatabase, resetDatabase, saveDatabase } from "./demo-storage";
import { createSeedDatabase } from "./seed-data";

function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

function err(code: string, message: string, details?: Record<string, unknown>): ServiceResult<never> {
  return { ok: false, error: { code, message, details } };
}

function getUser(db: DemoDatabase, userId: string): User | undefined {
  return db.users.find((u) => u.id === userId && u.active);
}

function admittedPatients(db: DemoDatabase): Patient[] {
  return db.patients.filter((p) => p.status === "admitted");
}

function syncRoomStatus(db: DemoDatabase): void {
  for (const room of db.rooms) {
    const occupied = db.patients.some(
      (p) => p.status === "admitted" && p.roomId === room.id,
    );
    room.status = occupied ? "occupied" : "available";
  }
}

function audit(
  db: DemoDatabase,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  previousValue?: string,
  newValue?: string,
): void {
  db.auditLogs.unshift({
    id: createId(),
    actorId,
    entityType,
    entityId,
    action,
    timestamp: new Date().toISOString(),
    previousValue,
    newValue,
  });
}

export class DemoRepository {
  private db: DemoDatabase;

  constructor(db?: DemoDatabase) {
    this.db = db ?? loadDatabase();
  }

  getDatabase(): DemoDatabase {
    return this.db;
  }

  persist(): void {
    saveDatabase(this.db);
  }

  resetDemoData(): DemoDatabase {
    this.db = resetDatabase();
    return this.db;
  }

  getUsers(): User[] {
    return this.db.users;
  }

  getSettings() {
    return this.db.facilitySettings;
  }

  getDashboardMetrics(): DashboardMetrics {
    const s = this.db.facilitySettings;
    return computeDashboardMetrics(
      this.db.patients,
      this.db.temperatureReadings,
      this.db.doctorVisits,
      this.db.dischargeRequests,
      s.maximumCapacity,
      s.feverThresholdCelsius,
      s.timezone,
    );
  }

  getAnalytics() {
    return computeAnalytics(
      this.db.patients,
      this.db.patientOutcomes,
      this.db.dischargeRequests,
    );
  }

  listPatients(): Patient[] {
    return [...this.db.patients].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }

  getPatient(patientId: string): Patient | undefined {
    return this.db.patients.find((p) => p.id === patientId);
  }

  getPatientReadings(patientId: string): TemperatureReading[] {
    return this.db.temperatureReadings
      .filter((r) => r.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
      );
  }

  getPatientVisits(patientId: string): DoctorVisit[] {
    return this.db.doctorVisits
      .filter((v) => v.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
      );
  }

  getFeverFree(patientId: string) {
    const p = this.getPatient(patientId);
    if (!p) return null;
    const s = this.db.facilitySettings;
    return calculateFeverFreeStreak(
      this.getPatientReadings(patientId),
      s.feverThresholdCelsius,
      s.timezone,
      p.admittedAt,
    );
  }

  registerPatient(
    actorId: string,
    role: UserRole,
    input: {
      fullName: string;
      age: number;
      roomId: string;
      adminNotes?: string;
    },
  ): ServiceResult<Patient> {
    if (!canRegisterPatient(role)) {
      return err("FORBIDDEN", "Only administrators can register patients.");
    }
    const user = getUser(this.db, actorId);
    if (!user) return err("UNAUTHORIZED", "Invalid user.");

    const admitted = admittedPatients(this.db);
    if (admitted.length >= this.db.facilitySettings.maximumCapacity) {
      return err(
        "CAPACITY_FULL",
        `All ${this.db.facilitySettings.maximumCapacity} beds are occupied. Cannot admit another patient.`,
      );
    }

    const room = this.db.rooms.find((r) => r.id === input.roomId);
    if (!room) return err("ROOM_NOT_FOUND", "Room not found.");
    const roomTaken = admitted.some((p) => p.roomId === input.roomId);
    if (roomTaken) {
      return err("ROOM_OCCUPIED", "This room is already assigned to an active patient.");
    }

    const code = `QC-${new Date().getFullYear()}-${String(
      this.db.patients.length + 1,
    ).padStart(4, "0")}`;
    const duplicateCode = this.db.patients.some((p) => p.patientCode === code);
    if (duplicateCode) {
      return err("DUPLICATE", "Patient ID collision. Please retry.");
    }

    const now = new Date().toISOString();
    const patient: Patient = {
      id: createId(),
      patientCode: code,
      fullName: input.fullName,
      age: input.age,
      roomId: input.roomId,
      admittedAt: now,
      status: "admitted",
      adminNotes: input.adminNotes,
      createdAt: now,
      updatedAt: now,
    };
    this.db.patients.push(patient);
    syncRoomStatus(this.db);
    audit(this.db, actorId, "Patient", patient.id, "register", undefined, patient.patientCode);
    this.persist();
    return ok(patient);
  }

  recordTemperature(
    actorId: string,
    role: UserRole,
    input: {
      patientId: string;
      temperatureCelsius: number;
      notes?: string;
      observedAt?: string;
    },
  ): ServiceResult<TemperatureReading> {
    if (!canRecordTemperature(role)) {
      return err("FORBIDDEN", "Only nurses can record temperatures.");
    }
    const user = getUser(this.db, actorId);
    if (!user) return err("UNAUTHORIZED", "Invalid user.");

    const patient = this.getPatient(input.patientId);
    if (!patient) return err("NOT_FOUND", "Patient not found.");
    if (patient.status !== "admitted") {
      return err(
        "INVALID_STATUS",
        "Routine temperature can only be recorded for admitted patients.",
      );
    }

    const validation = validateTemperature(input.temperatureCelsius);
    if (validation) return err("INVALID_TEMP", validation);

    const tz = this.db.facilitySettings.timezone;
    const observedAt = input.observedAt ?? new Date().toISOString();
    const localDate = toFacilityLocalDate(observedAt, tz);
    const existing = hasRoutineReadingForDate(
      this.getPatientReadings(patient.id),
      localDate,
    );
    if (existing) {
      return err("DUPLICATE_READING", "A temperature has already been recorded for this patient today.", {
        existingId: existing.id,
        temperature: existing.temperatureCelsius,
        observedAt: existing.observedAt,
      });
    }

    const reading: TemperatureReading = {
      id: createId(),
      patientId: patient.id,
      temperatureCelsius: input.temperatureCelsius,
      observedAt,
      facilityLocalDate: localDate,
      recordedBy: actorId,
      notes: input.notes,
      correctionOfId: null,
      createdAt: new Date().toISOString(),
    };
    this.db.temperatureReadings.push(reading);
    audit(this.db, actorId, "TemperatureReading", reading.id, "create");
    this.persist();
    return ok(reading);
  }

  correctTemperature(
    actorId: string,
    role: UserRole,
    input: {
      correctionOfId: string;
      temperatureCelsius: number;
      notes?: string;
    },
  ): ServiceResult<TemperatureReading> {
    if (!canCorrectTemperature(role)) {
      return err("FORBIDDEN", "Only nurses can correct temperature readings.");
    }
    const original = this.db.temperatureReadings.find(
      (r) => r.id === input.correctionOfId,
    );
    if (!original) return err("NOT_FOUND", "Original reading not found.");
    const validation = validateTemperature(input.temperatureCelsius);
    if (validation) return err("INVALID_TEMP", validation);

    const correction: TemperatureReading = {
      id: createId(),
      patientId: original.patientId,
      temperatureCelsius: input.temperatureCelsius,
      observedAt: new Date().toISOString(),
      facilityLocalDate: original.facilityLocalDate,
      recordedBy: actorId,
      notes: input.notes ?? "Correction",
      correctionOfId: original.id,
      createdAt: new Date().toISOString(),
    };
    this.db.temperatureReadings.push(correction);
    audit(
      this.db,
      actorId,
      "TemperatureReading",
      correction.id,
      "correct",
      String(original.temperatureCelsius),
      String(input.temperatureCelsius),
    );
    this.persist();
    return ok(correction);
  }

  recordDoctorVisit(
    actorId: string,
    role: UserRole,
    input: {
      patientId: string;
      clinicalNotes: string;
      treatmentPlan?: string;
      followUpInstructions?: string;
      visitedAt?: string;
    },
  ): ServiceResult<DoctorVisit> {
    if (!canRecordDoctorVisit(role)) {
      return err("FORBIDDEN", "Only doctors can record visits.");
    }
    const user = getUser(this.db, actorId);
    if (!user) return err("UNAUTHORIZED", "Invalid user.");

    const patient = this.getPatient(input.patientId);
    if (!patient) return err("NOT_FOUND", "Patient not found.");
    if (patient.status !== "admitted") {
      return err("INVALID_STATUS", "Visits can only be recorded for admitted patients.");
    }

    const tz = this.db.facilitySettings.timezone;
    const visitedAt = input.visitedAt ?? new Date().toISOString();
    const localDate = toFacilityLocalDate(visitedAt, tz);
    const dup = this.db.doctorVisits.find(
      (v) => v.patientId === patient.id && v.facilityLocalDate === localDate,
    );
    if (dup) {
      return err("DUPLICATE_VISIT", "A doctor visit has already been recorded for today.", {
        existingId: dup.id,
      });
    }

    const today = todayFacilityDate(tz);
    const tempMissing =
      localDate === today &&
      !hasRoutineReadingForDate(this.getPatientReadings(patient.id), today);

    const visit: DoctorVisit = {
      id: createId(),
      patientId: patient.id,
      doctorId: actorId,
      visitedAt,
      facilityLocalDate: localDate,
      clinicalNotes: input.clinicalNotes,
      treatmentPlan: input.treatmentPlan,
      followUpInstructions: input.followUpInstructions,
      temperatureMissingFlag: tempMissing,
      createdAt: new Date().toISOString(),
    };
    this.db.doctorVisits.push(visit);
    audit(this.db, actorId, "DoctorVisit", visit.id, "create");
    this.persist();
    return ok(visit);
  }

  confirmDischarge(
    actorId: string,
    role: UserRole,
    patientId: string,
    notes?: string,
  ): ServiceResult<DischargeRequest> {
    if (!canConfirmDischarge(role)) {
      return err("FORBIDDEN", "Only doctors can confirm clinical discharge.");
    }
    const patient = this.getPatient(patientId);
    if (!patient || patient.status !== "admitted") {
      return err("INVALID_STATUS", "Patient is not actively admitted.");
    }

    const existing = this.db.dischargeRequests.find(
      (r) =>
        r.patientId === patientId &&
        (r.status === "awaiting_administration" || r.status === "completed"),
    );
    if (existing) {
      return err("DUPLICATE_REQUEST", "A discharge request already exists for this patient.", {
        requestId: existing.id,
      });
    }

    const feverFree = this.getFeverFree(patientId);
    if (!feverFree?.eligibleForDischarge) {
      return err(
        "NOT_ELIGIBLE",
        feverFree?.explanation ??
          "Patient does not meet the three consecutive fever-free day requirement.",
      );
    }

    const request: DischargeRequest = {
      id: createId(),
      patientId,
      requestedBy: actorId,
      eligibilityConfirmedBy: actorId,
      eligibilityConfirmedAt: new Date().toISOString(),
      status: "awaiting_administration",
      notes,
      feverFreeDates: feverFree.qualifyingDates.slice(-3),
      createdAt: new Date().toISOString(),
    };
    this.db.dischargeRequests.push(request);
    audit(this.db, actorId, "DischargeRequest", request.id, "confirm_clinical");
    this.persist();
    return ok(request);
  }

  completeAdministrativeDischarge(
    actorId: string,
    role: UserRole,
    requestId: string,
  ): ServiceResult<Patient> {
    if (!canCompleteAdminDischarge(role)) {
      return err("FORBIDDEN", "Only administrators can complete discharge.");
    }
    const request = this.db.dischargeRequests.find((r) => r.id === requestId);
    if (!request) return err("NOT_FOUND", "Discharge request not found.");
    if (request.status !== "awaiting_administration") {
      return err("INVALID_STATUS", "This request is not awaiting administrative processing.");
    }
    if (!request.eligibilityConfirmedBy) {
      return err(
        "DOCTOR_NOT_CONFIRMED",
        "Administrative discharge requires doctor confirmation of clinical eligibility.",
      );
    }

    const patient = this.getPatient(request.patientId);
    if (!patient) return err("NOT_FOUND", "Patient not found.");
    const now = new Date().toISOString();
    patient.status = "discharged";
    patient.updatedAt = now;
    request.status = "completed";
    request.administrativeProcessedBy = actorId;
    request.processedAt = now;
    syncRoomStatus(this.db);
    audit(this.db, actorId, "Patient", patient.id, "discharge_complete");
    this.persist();
    return ok(patient);
  }

  recordDeath(
    actorId: string,
    role: UserRole,
    patientId: string,
    notes?: string,
  ): ServiceResult<Patient> {
    if (!canRecordDeath(role)) {
      return err("FORBIDDEN", "Only administrators can record death outcomes.");
    }
    const patient = this.getPatient(patientId);
    if (!patient || patient.status !== "admitted") {
      return err("INVALID_STATUS", "Patient must be actively admitted.");
    }
    const now = new Date().toISOString();
    patient.status = "deceased";
    patient.updatedAt = now;
    this.db.patientOutcomes.push({
      id: createId(),
      patientId,
      outcomeType: "death",
      outcomeAt: now,
      recordedBy: actorId,
      notes,
    });
    syncRoomStatus(this.db);
    audit(this.db, actorId, "Patient", patientId, "record_death");
    this.persist();
    return ok(patient);
  }

  updateSettings(
    actorId: string,
    role: UserRole,
    patch: Partial<{
      facilityName: string;
      maximumCapacity: number;
      feverThresholdCelsius: number;
      timezone: string;
    }>,
  ): ServiceResult<typeof this.db.facilitySettings> {
    if (!canUpdateSettings(role)) {
      return err("FORBIDDEN", "Only administrators can update settings.");
    }
    const s = this.db.facilitySettings;
    const prev = JSON.stringify(s);
    if (patch.facilityName !== undefined) s.facilityName = patch.facilityName;
    if (patch.maximumCapacity !== undefined) {
      if (patch.maximumCapacity < admittedPatients(this.db).length) {
        return err(
          "CAPACITY_TOO_LOW",
          "Maximum capacity cannot be below current occupied beds.",
        );
      }
      s.maximumCapacity = patch.maximumCapacity;
    }
    if (patch.feverThresholdCelsius !== undefined) {
      if (patch.feverThresholdCelsius < 35 || patch.feverThresholdCelsius > 42) {
        return err("INVALID_THRESHOLD", "Fever threshold must be between 35°C and 42°C.");
      }
      s.feverThresholdCelsius = patch.feverThresholdCelsius;
    }
    if (patch.timezone !== undefined) s.timezone = patch.timezone;
    s.updatedAt = new Date().toISOString();
    s.updatedBy = actorId;
    audit(this.db, actorId, "FacilitySettings", s.id, "update", prev, JSON.stringify(s));
    this.persist();
    return ok(s);
  }

  getAvailableRooms() {
    syncRoomStatus(this.db);
    return this.db.rooms.filter((r) => r.status === "available");
  }

  getDischargeQueue() {
    return this.db.dischargeRequests.filter(
      (r) => r.status === "awaiting_administration" || r.status === "completed",
    );
  }

  getAuditLogs(limit = 50) {
    return this.db.auditLogs.slice(0, limit);
  }
}

/** In-memory instance for unit tests (no localStorage). */
export function createTestRepository(db?: DemoDatabase): DemoRepository {
  return new DemoRepository(db ?? createSeedDatabase());
}
