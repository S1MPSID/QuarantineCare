import type { DemoDatabase } from "@/domain/types";
import { createSeedDatabase, DEMO_STORAGE_KEY } from "./seed-data";

export function loadDatabase(): DemoDatabase {
  if (typeof window === "undefined") {
    throw new Error("loadDatabase is client-only");
  }
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    const seed = createSeedDatabase();
    saveDatabase(seed);
    return seed;
  }
  try {
    return JSON.parse(raw) as DemoDatabase;
  } catch {
    const seed = createSeedDatabase();
    saveDatabase(seed);
    return seed;
  }
}

export function saveDatabase(db: DemoDatabase): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
}

export function resetDatabase(): DemoDatabase {
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}
