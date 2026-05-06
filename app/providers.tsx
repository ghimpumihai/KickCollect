"use client";

import { Suspense, type ReactNode } from "react";

import { CardProvider } from "@/lib/stores/card-context";
import { UserInsightsProvider } from "@/lib/stores/user-insights-context";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense fallback={null}>
      <UserInsightsProvider>
        <CardProvider>{children}</CardProvider>
      </UserInsightsProvider>
    </Suspense>
  );
}
