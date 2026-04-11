"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function ClerkProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider ui={ui} appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  );
}
