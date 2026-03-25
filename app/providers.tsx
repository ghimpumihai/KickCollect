"use client";

import type { ReactNode } from "react";

import { CardProvider } from "@/lib/stores/card-context";
import { UserInsightsProvider } from "@/lib/stores/user-insights-context";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <UserInsightsProvider>
      <CardProvider>{children}</CardProvider>
    </UserInsightsProvider>
  );
}
