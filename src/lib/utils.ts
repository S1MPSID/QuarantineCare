import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTemp(c: number): string {
  return `${c.toFixed(1)}°C`;
}
