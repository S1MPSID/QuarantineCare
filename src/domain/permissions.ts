import type { UserRole } from "./types";

export function canRecordTemperature(role: UserRole): boolean {
  return role === "nurse";
}

export function canRecordDoctorVisit(role: UserRole): boolean {
  return role === "doctor";
}

export function canRegisterPatient(role: UserRole): boolean {
  return role === "administrator";
}

export function canConfirmDischarge(role: UserRole): boolean {
  return role === "doctor";
}

export function canCompleteAdminDischarge(role: UserRole): boolean {
  return role === "administrator";
}

export function canRecordDeath(role: UserRole): boolean {
  return role === "administrator";
}

export function canUpdateSettings(role: UserRole): boolean {
  return role === "administrator";
}

export function canCorrectTemperature(role: UserRole): boolean {
  return role === "nurse";
}
