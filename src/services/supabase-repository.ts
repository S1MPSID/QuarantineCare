import type { SupabaseClient } from "@supabase/supabase-js";
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
import { DemoRepository } from "./demo-repository";
import {
  auditToRow,
  datasetToDomain,
  dischargeToRow,
  outcomeToRow,
  patientToRow,
  readingToRow,
  roomToRow,
  settingsToRow,
  userToRow,
  visitToRow,
  type AuditLogRow,
  type DischargeRequestRow,
  type DoctorVisitRow,
  type FacilitySettingsRow,
  type PatientOutcomeRow,
  type PatientRow,
  type RoomRow,
  type SupabaseDataset,
  type TemperatureReadingRow,
  type UserRow,
} from "./mappers";

export interface SyncError {
  message: string;
  code?: string;
  at: string;
}

type Listener = () => void;

function snapshot(db: DemoDatabase): string {
  return JSON.stringify(db);
}

/** Fetch every table and assemble an in-memory DemoDatabase. */
export async function loadDatabaseFromSupabase(
  client: SupabaseClient,
): Promise<DemoDatabase> {
  const [
    users,
    rooms,
    patients,
    temperatureReadings,
    doctorVisits,
    dischargeRequests,
    patientOutcomes,
    auditLogs,
    facilitySettings,
  ] = await Promise.all([
    client.from("users").select("*"),
    client.from("rooms").select("*"),
    client.from("patients").select("*"),
    client.from("temperature_readings").select("*"),
    client.from("doctor_visits").select("*"),
    client.from("discharge_requests").select("*"),
    client.from("patient_outcomes").select("*"),
    client.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(500),
    client.from("facility_settings").select("*").limit(1).maybeSingle(),
  ]);

  const firstError =
    users.error ||
    rooms.error ||
    patients.error ||
    temperatureReadings.error ||
    doctorVisits.error ||
    dischargeRequests.error ||
    patientOutcomes.error ||
    auditLogs.error ||
    facilitySettings.error;
  if (firstError) {
    throw new Error(`Failed to load data from Supabase: ${firstError.message}`);
  }

  const dataset: SupabaseDataset = {
    users: (users.data ?? []) as UserRow[],
    rooms: (rooms.data ?? []) as RoomRow[],
    patients: (patients.data ?? []) as PatientRow[],
    temperatureReadings: (temperatureReadings.data ?? []) as TemperatureReadingRow[],
    doctorVisits: (doctorVisits.data ?? []) as DoctorVisitRow[],
    dischargeRequests: (dischargeRequests.data ?? []) as DischargeRequestRow[],
    patientOutcomes: (patientOutcomes.data ?? []) as PatientOutcomeRow[],
    auditLogs: (auditLogs.data ?? []) as AuditLogRow[],
    facilitySettings: (facilitySettings.data ?? null) as FacilitySettingsRow | null,
  };

  return datasetToDomain(dataset);
}

/** Resolve the current user's row (role etc.) from an auth user id. */
export async function fetchUserProfile(
  client: SupabaseClient,
  authUserId: string,
) {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", authUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserRow | null;
}

interface TableSpec {
  name: string;
  get: (db: DemoDatabase) => { id: string }[];
  toRow: (entity: { id: string }) => Record<string, unknown>;
}

/**
 * Supabase-backed repository. Reuses every read/validation method of
 * DemoRepository against an in-memory snapshot, and mirrors writes to Postgres
 * using a serialized diff-and-write flush after each mutation.
 */
export class SupabaseRepository extends DemoRepository {
  private readonly client: SupabaseClient;
  private baseline: string;
  private flushing = false;
  private pending = false;
  private listeners = new Set<Listener>();
  private syncError: SyncError | null = null;

  constructor(client: SupabaseClient, db: DemoDatabase) {
    super(db);
    this.client = client;
    this.baseline = snapshot(db);
  }

  override persist(): void {
    this.queueFlush();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSyncError(): SyncError | null {
    return this.syncError;
  }

  clearSyncError(): void {
    if (!this.syncError) return;
    this.syncError = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private setSyncError(error: SyncError | null): void {
    this.syncError = error;
    this.emit();
  }

  private queueFlush(): void {
    if (this.flushing) {
      this.pending = true;
      return;
    }
    this.flushing = true;
    void this.flush()
      .catch(() => undefined)
      .finally(() => {
        this.flushing = false;
        if (this.pending) {
          this.pending = false;
          this.queueFlush();
        }
      });
  }

  private tables(): TableSpec[] {
    return [
      { name: "users", get: (db) => db.users, toRow: (e) => userToRow(e as User) },
      { name: "rooms", get: (db) => db.rooms, toRow: (e) => roomToRow(e as Room) },
      {
        name: "facility_settings",
        get: (db) => [db.facilitySettings],
        toRow: (e) => settingsToRow(e as FacilitySettings),
      },
      { name: "patients", get: (db) => db.patients, toRow: (e) => patientToRow(e as Patient) },
      {
        name: "temperature_readings",
        get: (db) => db.temperatureReadings,
        toRow: (e) => readingToRow(e as TemperatureReading),
      },
      {
        name: "doctor_visits",
        get: (db) => db.doctorVisits,
        toRow: (e) => visitToRow(e as DoctorVisit),
      },
      {
        name: "discharge_requests",
        get: (db) => db.dischargeRequests,
        toRow: (e) => dischargeToRow(e as DischargeRequest),
      },
      {
        name: "patient_outcomes",
        get: (db) => db.patientOutcomes,
        toRow: (e) => outcomeToRow(e as PatientOutcome),
      },
      { name: "audit_logs", get: (db) => db.auditLogs, toRow: (e) => auditToRow(e as AuditLog) },
    ];
  }

  private async flush(): Promise<void> {
    const current = this.getDatabase();
    const previous = JSON.parse(this.baseline) as DemoDatabase;

    const upserts: (() => Promise<void>)[] = [];
    const deletes: (() => Promise<void>)[] = [];

    for (const table of this.tables()) {
      const prevEntities = table.get(previous);
      const nextEntities = table.get(current);
      const prevById = new Map(prevEntities.map((e) => [e.id, e]));
      const nextIds = new Set(nextEntities.map((e) => e.id));

      const toUpsert: Record<string, unknown>[] = [];
      for (const entity of nextEntities) {
        const before = prevById.get(entity.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(entity)) {
          toUpsert.push(table.toRow(entity));
        }
      }
      const toDelete = prevEntities
        .filter((e) => !nextIds.has(e.id))
        .map((e) => e.id);

      if (toUpsert.length > 0) {
        upserts.push(async () => {
          const { error } = await this.client.from(table.name).upsert(toUpsert);
          if (error) throw new Error(`${table.name}: ${error.message}`);
        });
      }
      if (toDelete.length > 0) {
        deletes.push(async () => {
          const { error } = await this.client.from(table.name).delete().in("id", toDelete);
          if (error) throw new Error(`${table.name}: ${error.message}`);
        });
      }
    }

    if (upserts.length === 0 && deletes.length === 0) {
      this.baseline = snapshot(current);
      return;
    }

    try {
      // Deletes first (reverse FK order), then upserts in FK-safe order.
      for (const run of deletes.reverse()) await run();
      for (const run of upserts) await run();
      this.baseline = snapshot(this.getDatabase());
      if (this.syncError) this.setSyncError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      this.setSyncError({ message, at: new Date().toISOString() });
      throw error;
    }
  }
}
