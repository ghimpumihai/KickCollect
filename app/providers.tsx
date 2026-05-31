"use client";

import { Suspense, type ReactNode } from "react";

import { CardProvider } from "@/lib/stores/card-context";
import { AuthProvider } from "@/lib/stores/auth-context";
import { UserInsightsProvider } from "@/lib/stores/user-insights-context";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <UserInsightsProvider>
          <CardProvider>{children}</CardProvider>
        </UserInsightsProvider>
      </AuthProvider>
    </Suspense>
  );
}
