"use client";

import type { ReactNode } from "react";

import { CardProvider } from "@/lib/stores/card-context";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <CardProvider>{children}</CardProvider>;
}
