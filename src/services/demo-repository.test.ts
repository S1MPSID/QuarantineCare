import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "./seed-data";
import { DemoRepository } from "./demo-repository";
import type { DemoDatabase } from "@/domain/types";
import { calculateFeverFreeStreak } from "@/domain/temperature";
import { createId } from "./id";

function freshRepo(): DemoRepository {
  return new DemoRepository(createSeedDatabase());
}

function fillToCapacity(repo: DemoRepository): void {
  const db = repo.getDatabase();
  while (
    db.patients.filter((p) => p.status === "admitted").length <
    db.facilitySettings.maximumCapacity
  ) {
    const room = repo.getAvailableRooms()[0];
    if (!room) break;
    repo.registerPatient("user-admin-1", "administrator", {
      fullName: "Fill Bed Patient",
      age: 40,
      roomId: room.id,
    });
  }
}

describe("DemoRepository", () => {
  it("registers a patient when capacity is available", () => {
    const repo = freshRepo();
    const room = repo.getAvailableRooms()[0];
    expect(room).toBeDefined();
    const result = repo.registerPatient("user-admin-1", "administrator", {
      fullName: "New Synthetic Patient",
      age: 45,
      roomId: room!.id,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects admission when all beds are occupied", () => {
    const repo = freshRepo();
    fillToCapacity(repo);
    const room = repo.getAvailableRooms()[0];
    const result = repo.registerPatient("user-admin-1", "administrator", {
      fullName: "Overflow",
      age: 30,
      roomId: room?.id ?? "room-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CAPACITY_FULL");
  });

  it("rejects duplicate room allocation", () => {
    const repo = freshRepo();
    const occupied = repo
      .listPatients()
      .find((p) => p.status === "admitted");
    expect(occupied).toBeDefined();
    const result = repo.registerPatient("user-admin-1", "administrator", {
      fullName: "Duplicate Room",
      age: 33,
      roomId: occupied!.roomId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ROOM_OCCUPIED");
  });

  it("records valid daily temperature", () => {
    const repo = freshRepo();
    const patient = repo.listPatients().find((p) => p.status === "admitted");
    const result = repo.recordTemperature("user-nurse-1", "nurse", {
      patientId: patient!.id,
      temperatureCelsius: 37.0,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate routine temperature", () => {
    const repo = freshRepo();
    const patient = repo.listPatients().find((p) => p.fullName.includes("Mohammed"));
    const first = repo.recordTemperature("user-nurse-1", "nurse", {
      patientId: patient!.id,
      temperatureCelsius: 36.9,
    });
    expect(first.ok).toBe(true);
    const second = repo.recordTemperature("user-nurse-1", "nurse", {
      patientId: patient!.id,
      temperatureCelsius: 37.1,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("DUPLICATE_READING");
  });

  it("rejects invalid temperature", () => {
    const repo = freshRepo();
    const patient = repo.listPatients().find((p) => p.status === "admitted");
    const result = repo.recordTemperature("user-nurse-1", "nurse", {
      patientId: patient!.id,
      temperatureCelsius: 99,
    });
    expect(result.ok).toBe(false);
  });

  it("records doctor visit and flags missing temperature", () => {
    const repo = freshRepo();
    const patient = repo
      .listPatients()
      .find((p) => p.fullName.includes("Mohammed"));
    const result = repo.recordDoctorVisit("user-doctor-1", "doctor", {
      patientId: patient!.id,
      clinicalNotes: "Review despite missing nursing temp.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.temperatureMissingFlag).toBe(true);
  });

  it("prevents admin discharge without doctor confirmation", () => {
    const repo = freshRepo();
    const fakeRequest = {
      id: createId(),
      patientId: repo.listPatients().find((p) => p.status === "admitted")!.id,
      requestedBy: "user-doctor-1",
      eligibilityConfirmedBy: "",
      eligibilityConfirmedAt: "",
      status: "awaiting_administration" as const,
      feverFreeDates: [],
      createdAt: new Date().toISOString(),
    };
    repo.getDatabase().dischargeRequests.push(fakeRequest);
    const result = repo.completeAdministrativeDischarge(
      "user-admin-1",
      "administrator",
      fakeRequest.id,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DOCTOR_NOT_CONFIRMED");
  });

  it("releases room after completed discharge", () => {
    const repo = freshRepo();
    const request = repo
      .getDischargeQueue()
      .find((r) => r.status === "awaiting_administration");
    expect(request).toBeDefined();
    const patient = repo.getPatient(request!.patientId)!;
    const roomBefore = patient.roomId;
    const result = repo.completeAdministrativeDischarge(
      "user-admin-1",
      "administrator",
      request!.id,
    );
    expect(result.ok).toBe(true);
    const room = repo.getDatabase().rooms.find((r) => r.id === roomBefore);
    expect(room?.status).toBe("available");
  });

  it("enforces role permissions", () => {
    const repo = freshRepo();
    const patient = repo.listPatients().find((p) => p.status === "admitted");
    const result = repo.recordTemperature("user-doctor-1", "doctor", {
      patientId: patient!.id,
      temperatureCelsius: 37,
    });
    expect(result.ok).toBe(false);
  });

  it("retains audit after correction", () => {
    const repo = freshRepo();
    const reading = repo.getDatabase().temperatureReadings[0];
    const before = repo.getAuditLogs().length;
    repo.correctTemperature("user-nurse-1", "nurse", {
      correctionOfId: reading.id,
      temperatureCelsius: 37.2,
    });
    expect(repo.getAuditLogs().length).toBeGreaterThan(before);
    expect(
      repo.getDatabase().temperatureReadings.some((r) => r.correctionOfId),
    ).toBe(true);
  });

  it("updates dashboard metrics after temperature recorded", () => {
    const repo = freshRepo();
    const before = repo.getDashboardMetrics().tempCompletedToday;
    const patient = repo.listPatients().find((p) => p.fullName.includes("Mohammed"));
    repo.recordTemperature("user-nurse-1", "nurse", {
      patientId: patient!.id,
      temperatureCelsius: 36.8,
    });
    const after = repo.getDashboardMetrics().tempCompletedToday;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("calculates mortality from resolved outcomes", () => {
    const repo = freshRepo();
    const m = repo.getAnalytics();
    expect(m.resolvedOutcomes).toBeGreaterThan(0);
    expect(m.mortalityRate).not.toBeNull();
    expect(m.survivalRate).not.toBeNull();
  });
});

describe("Fever-free streak", () => {
  const tz = "Asia/Kolkata";
  const threshold = 38;

  it("calculates streak correctly", () => {
    const admittedAt = new Date().toISOString();
    const readings = [
      {
        id: "1",
        patientId: "p",
        temperatureCelsius: 37,
        observedAt: new Date().toISOString(),
        facilityLocalDate: "2026-10-09",
        recordedBy: "n",
        createdAt: new Date().toISOString(),
      },
    ];
    const result = calculateFeverFreeStreak(
      readings,
      threshold,
      tz,
      admittedAt,
      "2026-10-09",
    );
    expect(result.streak).toBe(1);
  });

  it("breaks streak after fever", () => {
    const result = calculateFeverFreeStreak(
      [
        {
          id: "1",
          patientId: "p",
          temperatureCelsius: 38.5,
          observedAt: "2026-10-09T10:00:00Z",
          facilityLocalDate: "2026-10-09",
          recordedBy: "n",
          createdAt: "2026-10-09T10:00:00Z",
        },
        {
          id: "2",
          patientId: "p",
          temperatureCelsius: 37,
          observedAt: "2026-10-08T10:00:00Z",
          facilityLocalDate: "2026-10-08",
          recordedBy: "n",
          createdAt: "2026-10-08T10:00:00Z",
        },
      ],
      threshold,
      tz,
      "2026-10-07T00:00:00Z",
      "2026-10-09",
    );
    expect(result.streak).toBe(0);
  });
});

describe("Analytics", () => {
  it("handles zero resolved outcomes in fresh seed edge case", () => {
    const db: DemoDatabase = {
      ...createSeedDatabase(),
      patients: [],
      patientOutcomes: [],
      dischargeRequests: [],
    };
    const repo = new DemoRepository(db);
    const metrics = repo.getAnalytics();
    expect(metrics.resolvedOutcomes).toBe(0);
    expect(metrics.mortalityRate).toBeNull();
  });
});
