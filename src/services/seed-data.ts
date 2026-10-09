import { addDays, subDays } from "date-fns";
import type { DemoDatabase, Patient, Room, TemperatureReading } from "@/domain/types";
import { toFacilityLocalDate } from "@/domain/dates";
import { createId } from "./id";

const TZ = "Asia/Kolkata";
const FEVER_THRESHOLD = 38.0;
const CAPACITY = 74;

const DEMO_USERS = [
  {
    id: "user-nurse-1",
    fullName: "Priya Sharma",
    email: "nurse.demo@quarantinecare.local",
    role: "nurse" as const,
    active: true,
  },
  {
    id: "user-doctor-1",
    fullName: "Dr. Arjun Mehta",
    email: "doctor.demo@quarantinecare.local",
    role: "doctor" as const,
    active: true,
  },
  {
    id: "user-admin-1",
    fullName: "Anita Desai",
    email: "admin.demo@quarantinecare.local",
    role: "administrator" as const,
    active: true,
  },
];

const FEATURED_NAMES = [
  "Ravi Kumar",
  "Sneha Patel",
  "Mohammed Ali",
  "Lakshmi Iyer",
  "Vikram Singh",
  "Ananya Reddy",
  "Karan Joshi",
  "Meera Nair",
  "Suresh Gupta",
  "Divya Menon",
  "Imran Khan",
  "Pooja Agarwal",
  "Rahul Verma",
  "Kavya Rao",
  "Amit Choudhury",
  "Neha Kapoor",
  "Sanjay Pillai",
  "Fatima Sheikh",
  "Deepak Malhotra",
  "Ishita Banerjee",
];

function isoDaysAgo(days: number, hour = 10): string {
  const d = subDays(new Date(), days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function tempReading(
  patientId: string,
  daysAgo: number,
  temp: number,
  nurseId: string,
  notes?: string,
): TemperatureReading {
  const observedAt = isoDaysAgo(daysAgo, 9);
  const facilityLocalDate = toFacilityLocalDate(observedAt, TZ);
  return {
    id: createId(),
    patientId,
    temperatureCelsius: temp,
    observedAt,
    facilityLocalDate,
    recordedBy: nurseId,
    notes,
    correctionOfId: null,
    createdAt: observedAt,
  };
}

export function createSeedDatabase(): DemoDatabase {
  const now = new Date().toISOString();
  const rooms: Room[] = Array.from({ length: CAPACITY }, (_, i) => ({
    id: `room-${i + 1}`,
    roomNumber: String(101 + i),
    status: "available" as const,
  }));

  const patients: Patient[] = [];
  const temperatureReadings: TemperatureReading[] = [];
  const nurseId = DEMO_USERS[0].id;
  const doctorId = DEMO_USERS[1].id;

  // Discharged patient (synthetic historical)
  const dischargedId = createId();
  const dischargedRoom = rooms[0];
  dischargedRoom.status = "available";
  patients.push({
    id: dischargedId,
    patientCode: "QC-2024-0001",
    fullName: "Harish Nambiar (Synthetic)",
    age: 54,
    roomId: dischargedRoom.id,
    admittedAt: isoDaysAgo(14),
    status: "discharged",
    adminNotes: "Demo: completed administrative discharge.",
    createdAt: isoDaysAgo(14),
    updatedAt: isoDaysAgo(1),
  });

  // Deceased patient
  const deceasedId = createId();
  patients.push({
    id: deceasedId,
    patientCode: "QC-2024-0002",
    fullName: "Geeta Krishnan (Synthetic)",
    age: 67,
    roomId: rooms[1].id,
    admittedAt: isoDaysAgo(10),
    status: "deceased",
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(3),
  });
  rooms[1].status = "available";

  let roomIndex = 2;
  const admittedPatients: Patient[] = [];

  for (let i = 0; i < CAPACITY - 2; i++) {
    const id = createId();
    const name =
      FEATURED_NAMES[i] ??
      `Synthetic Patient ${i + 1} (Demo)`;
    const room = rooms[roomIndex++];
    room.status = "occupied";
    const admittedAt = isoDaysAgo(5 + (i % 8));
    const patient: Patient = {
      id,
      patientCode: `QC-2024-${String(1003 + i).padStart(4, "0")}`,
      fullName: name,
      age: 28 + (i % 40),
      roomId: room.id,
      admittedAt,
      status: "admitted",
      adminNotes: i < 3 ? "Synthetic demo record." : undefined,
      createdAt: admittedAt,
      updatedAt: now,
    };
    patients.push(patient);
    admittedPatients.push(patient);
  }

  // Featured patient 0: fever today
  const p0 = admittedPatients[0];
  temperatureReadings.push(
    tempReading(p0.id, 3, 37.2, nurseId),
    tempReading(p0.id, 2, 37.5, nurseId),
    tempReading(p0.id, 1, 37.1, nurseId),
    tempReading(p0.id, 0, 38.6, nurseId, "Elevated — flag for review"),
  );

  // Patient 1: 3 fever-free days (discharge candidate)
  const p1 = admittedPatients[1];
  temperatureReadings.push(
    tempReading(p1.id, 4, 37.8, nurseId),
    tempReading(p1.id, 3, 37.2, nurseId),
    tempReading(p1.id, 2, 36.9, nurseId),
    tempReading(p1.id, 1, 37.0, nurseId),
    tempReading(p1.id, 0, 36.8, nurseId),
  );

  // Patient 2: missing today temp
  const p2 = admittedPatients[2];
  temperatureReadings.push(
    tempReading(p2.id, 2, 37.1, nurseId),
    tempReading(p2.id, 1, 37.0, nurseId),
  );

  // Patient 3: streak broken by fever yesterday
  const p3 = admittedPatients[3];
  temperatureReadings.push(
    tempReading(p3.id, 3, 36.9, nurseId),
    tempReading(p3.id, 2, 37.0, nurseId),
    tempReading(p3.id, 1, 38.2, nurseId),
    tempReading(p3.id, 0, 37.1, nurseId),
  );

  // Patient 4: doctor-confirmed discharge awaiting admin
  const p4 = admittedPatients[4];
  for (let d = 0; d <= 4; d++) {
    temperatureReadings.push(tempReading(p4.id, d, 36.7 + d * 0.05, nurseId));
  }

  // Default readings for others: today complete, normal temp
  for (let i = 5; i < admittedPatients.length; i++) {
    const p = admittedPatients[i];
    if (i % 7 === 0) continue; // missing today
    temperatureReadings.push(tempReading(p.id, 0, 36.5 + (i % 5) * 0.2, nurseId));
    if (i % 3 === 0) {
      temperatureReadings.push(tempReading(p.id, 1, 37.0, nurseId));
    }
  }

  const doctorVisits = admittedPatients
    .filter((_, idx) => idx !== 2 && idx % 5 !== 0)
    .map((p) => {
      const visitedAt = isoDaysAgo(0, 11);
      return {
        id: createId(),
        patientId: p.id,
        doctorId,
        visitedAt,
        facilityLocalDate: toFacilityLocalDate(visitedAt, TZ),
        clinicalNotes: "Synthetic daily review. Stable vitals per nursing record.",
        treatmentPlan: "Continue supportive care.",
        followUpInstructions: "Monitor temperature Q8H.",
        temperatureMissingFlag: false,
        createdAt: visitedAt,
      };
    });

  const dischargeRequests = [
    {
      id: createId(),
      patientId: p4.id,
      requestedBy: doctorId,
      eligibilityConfirmedBy: doctorId,
      eligibilityConfirmedAt: subDays(new Date(), 0).toISOString(),
      status: "awaiting_administration" as const,
      notes: "Synthetic: clinically cleared for discharge.",
      feverFreeDates: [0, 1, 2, 3].map((d) =>
        toFacilityLocalDate(isoDaysAgo(d), TZ),
      ),
      createdAt: now,
    },
    {
      id: createId(),
      patientId: dischargedId,
      requestedBy: doctorId,
      eligibilityConfirmedBy: doctorId,
      eligibilityConfirmedAt: isoDaysAgo(2),
      administrativeProcessedBy: DEMO_USERS[2].id,
      processedAt: isoDaysAgo(1),
      status: "completed" as const,
      feverFreeDates: [],
      createdAt: isoDaysAgo(2),
    },
  ];

  const patientOutcomes = [
    {
      id: createId(),
      patientId: deceasedId,
      outcomeType: "death" as const,
      outcomeAt: isoDaysAgo(3),
      recordedBy: DEMO_USERS[2].id,
      notes: "Synthetic outcome for analytics demonstration.",
    },
  ];

  return {
    patients,
    rooms,
    temperatureReadings,
    doctorVisits,
    dischargeRequests,
    patientOutcomes,
    users: DEMO_USERS,
    auditLogs: [
      {
        id: createId(),
        actorId: DEMO_USERS[2].id,
        entityType: "FacilitySettings",
        entityId: "settings-1",
        action: "seed",
        timestamp: now,
        newValue: "Initial synthetic demo dataset loaded.",
      },
    ],
    facilitySettings: {
      id: "settings-1",
      facilityName: "QuarantineCare Treatment Facility (Demo)",
      maximumCapacity: CAPACITY,
      feverThresholdCelsius: FEVER_THRESHOLD,
      timezone: TZ,
      updatedAt: now,
      updatedBy: DEMO_USERS[2].id,
    },
  };
}

export const DEMO_STORAGE_KEY = "quarantinecare-demo-v1";
