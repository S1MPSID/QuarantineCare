"use client";

import { AppProvider } from "@/contexts/app-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
