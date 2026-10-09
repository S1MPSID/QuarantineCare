export type UserRole = "nurse" | "doctor" | "administrator";

export type PatientStatus = "admitted" | "discharged" | "deceased";

export type RoomStatus = "available" | "occupied";

export type DischargeRequestStatus =
  | "awaiting_administration"
  | "completed"
  | "cancelled";

export type OutcomeType = "recovered" | "death";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Room {
  id: string;
  roomNumber: string;
  status: RoomStatus;
}

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  age: number;
  roomId: string;
  admittedAt: string;
  status: PatientStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemperatureReading {
  id: string;
  patientId: string;
  temperatureCelsius: number;
  observedAt: string;
  facilityLocalDate: string;
  recordedBy: string;
  notes?: string;
  correctionOfId?: string | null;
  createdAt: string;
}

export interface DoctorVisit {
  id: string;
  patientId: string;
  doctorId: string;
  visitedAt: string;
  facilityLocalDate: string;
  clinicalNotes: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  temperatureMissingFlag: boolean;
  createdAt: string;
}

export interface DischargeRequest {
  id: string;
  patientId: string;
  requestedBy: string;
  eligibilityConfirmedBy: string;
  eligibilityConfirmedAt: string;
  administrativeProcessedBy?: string;
  processedAt?: string;
  status: DischargeRequestStatus;
  notes?: string;
  feverFreeDates: string[];
  createdAt: string;
}

export interface PatientOutcome {
  id: string;
  patientId: string;
  outcomeType: OutcomeType;
  outcomeAt: string;
  recordedBy: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface FacilitySettings {
  id: string;
  facilityName: string;
  maximumCapacity: number;
  feverThresholdCelsius: number;
  timezone: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface DemoDatabase {
  patients: Patient[];
  rooms: Room[];
  temperatureReadings: TemperatureReading[];
  doctorVisits: DoctorVisit[];
  dischargeRequests: DischargeRequest[];
  patientOutcomes: PatientOutcome[];
  users: User[];
  auditLogs: AuditLog[];
  facilitySettings: FacilitySettings;
}

export interface FeverFreeResult {
  streak: number;
  qualifyingDates: string[];
  eligibleForDischarge: boolean;
  explanation: string;
}

export interface DashboardMetrics {
  totalAdmitted: number;
  occupiedBeds: number;
  maxCapacity: number;
  availableBeds: number;
  tempCompletedToday: number;
  tempPendingToday: number;
  visitsCompletedToday: number;
  visitsPendingToday: number;
  dischargeCandidates: number;
  dischargeAwaitingAdmin: number;
  tempCompletionRate: number;
  visitCompletionRate: number;
}

export interface AnalyticsMetrics {
  totalAdmissions: number;
  completedDischarges: number;
  activeCensus: number;
  deaths: number;
  resolvedOutcomes: number;
  mortalityRate: number | null;
  survivalRate: number | null;
  avgLengthOfStayDays: number | null;
  mortalityExceedsBenchmark: boolean;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };
