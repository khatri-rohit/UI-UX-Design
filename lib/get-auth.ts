/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@clerk/nextjs/server";

import { clerkClient } from "@/lib/client";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

const EMAIL_FALLBACK_DOMAIN = "clerk.local";

type Provider = "GOOGLE" | "GITHUB" | "EMAIL";

export interface AppAuthContext {
  appUserId: string;
  role: string;
  email: string;
  clerkUserId: string;
  clerkSessionId: string;
  organizationId: string | null;
  organizationSlug: string | null;
}

interface RequireAuthContextOptions {
  request?: Request;
  eventType?: string;
  allowPendingSession?: boolean;
}

type SessionClaims = {
  iat?: number;
  exp?: number;
  sts?: string;
  o?: {
    id?: string;
    slg?: string;
  };
};

export class AuthError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTH_REQUIRED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Forbidden") {
    super(message, 403, "AUTH_FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

function parseJwtTimestamp(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed * 1000);
    }
  }

  return null;
}

function getRequestHeader(
  request: Request | undefined,
  headerName: string,
): string | null {
  if (!request) {
    return null;
  }

  const value = request.headers.get(headerName);
  return value && value.trim().length > 0 ? value : null;
}

function getClientIpAddress(request: Request | undefined): string | null {
  const forwardedFor = getRequestHeader(request, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return getRequestHeader(request, "x-real-ip");
}

function getRequestPath(request: Request | undefined): string | null {
  if (!request) {
    return null;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return null;
  }
}

function extractPrimaryEmail(clerkUser: any): string | null {
  const primaryId =
    clerkUser?.primaryEmailAddressId ?? clerkUser?.primary_email_address_id;
  const addresses = clerkUser?.emailAddresses ?? clerkUser?.email_addresses;

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }

  if (primaryId) {
    const primary = addresses.find(
      (address: any) =>
        (address?.id ??
          address?.emailAddressId ??
          address?.email_address_id) === primaryId,
    );

    const primaryEmail = primary?.emailAddress ?? primary?.email_address;
    if (typeof primaryEmail === "string" && primaryEmail.length > 0) {
      return primaryEmail;
    }
  }

  const fallback = addresses[0]?.emailAddress ?? addresses[0]?.email_address;
  return typeof fallback === "string" && fallback.length > 0 ? fallback : null;
}

function extractDisplayName(clerkUser: any, fallbackEmail: string): string {
  const firstName = clerkUser?.firstName ?? clerkUser?.first_name;
  const lastName = clerkUser?.lastName ?? clerkUser?.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName.length > 0) {
    return fullName;
  }

  const username = clerkUser?.username;
  if (typeof username === "string" && username.length > 0) {
    return username;
  }

  return fallbackEmail.split("@")[0] ?? "User";
}

function inferProvider(clerkUser: any): Provider {
  const accounts = clerkUser?.externalAccounts ?? clerkUser?.external_accounts;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    return "EMAIL";
  }

  const provider = String(
    accounts[0]?.provider ??
      accounts[0]?.providerName ??
      accounts[0]?.identificationType ??
      "",
  ).toLowerCase();

  if (provider.includes("google")) {
    return "GOOGLE";
  }

  if (provider.includes("github")) {
    return "GITHUB";
  }

  return "EMAIL";
}

function extractOrganizationClaims(sessionClaims: SessionClaims | null): {
  organizationId: string | null;
  organizationSlug: string | null;
} {
  const organizationClaim = sessionClaims?.o;

  return {
    organizationId: organizationClaim?.id ?? null,
    organizationSlug: organizationClaim?.slg ?? null,
  };
}

async function fetchClerkUser(clerkUserId: string): Promise<any | null> {
  try {
    return await clerkClient.users.getUser(clerkUserId);
  } catch (error) {
    logger.warn("Failed to fetch Clerk user for auth context", {
      clerkUserId,
      error: String(error),
    });
    return null;
  }
}

export async function requireAuthContext(
  options: RequireAuthContextOptions = {},
): Promise<AppAuthContext> {
  const authState = await auth();
  const sessionClaims = (authState.sessionClaims ??
    null) as SessionClaims | null;
  if (!authState.userId) {
    throw new UnauthorizedError();
  }

  if (!authState.sessionId) {
    throw new UnauthorizedError("Authenticated session is missing");
  }

  if (!options.allowPendingSession && sessionClaims?.sts === "pending") {
    throw new ForbiddenError("Session is pending completion");
  }

  const clerkUserId = authState.userId;
  const clerkSessionId = authState.sessionId;
  const clerkUser = await fetchClerkUser(clerkUserId);

  const fallbackEmail = `${clerkUserId}@${EMAIL_FALLBACK_DOMAIN}`;
  const clerkEmail = extractPrimaryEmail(clerkUser);
  const resolvedEmail = clerkEmail ?? fallbackEmail;
  const hasClerkProfileData = Boolean(clerkUser && clerkEmail);
  const profileName = extractDisplayName(clerkUser, resolvedEmail);
  const profileProvider = inferProvider(clerkUser);
  const { organizationId, organizationSlug } =
    extractOrganizationClaims(sessionClaims);

  const existingByClerkUserId = await prisma.user.findUnique({
    where: {
      clerkUserId,
    },
  });

  const existingByEmailWithoutClerkUserId =
    !existingByClerkUserId && clerkEmail
      ? await prisma.user.findFirst({
          where: {
            email: clerkEmail,
            clerkUserId: null,
          },
        })
      : null;

  const user = existingByClerkUserId
    ? await prisma.user.update({
        where: {
          id: existingByClerkUserId.id,
        },
        data: {
          clerkUserId,
          organizationId,
          organizationSlug,
          isActive: true,
          ...(hasClerkProfileData
            ? {
                email: resolvedEmail,
                name: profileName,
                provider: profileProvider,
              }
            : {}),
        },
      })
    : existingByEmailWithoutClerkUserId
      ? await prisma.user.update({
          where: {
            id: existingByEmailWithoutClerkUserId.id,
          },
          data: {
            clerkUserId,
            organizationId,
            organizationSlug,
            isActive: true,
            ...(hasClerkProfileData
              ? {
                  email: resolvedEmail,
                  name: profileName,
                  provider: profileProvider,
                }
              : {}),
          },
        })
      : await prisma.user.create({
          data: {
            clerkUserId,
            email: resolvedEmail,
            name: profileName,
            provider: hasClerkProfileData ? profileProvider : "EMAIL",
            organizationId,
            organizationSlug,
            isActive: true,
          },
        });

  const now = new Date();
  const issuedAt = parseJwtTimestamp(sessionClaims?.iat) ?? now;
  const expiresAt = parseJwtTimestamp(sessionClaims?.exp);
  const ipAddress = getClientIpAddress(options.request);
  const userAgent = getRequestHeader(options.request, "user-agent");

  await prisma.appSession.upsert({
    where: {
      clerkSessionId,
    },
    create: {
      userId: user.id,
      clerkSessionId,
      status: "ACTIVE",
      issuedAt,
      expiresAt: expiresAt ?? undefined,
      lastActiveAt: now,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
    update: {
      userId: user.id,
      status: "ACTIVE",
      expiresAt: expiresAt ?? undefined,
      lastActiveAt: now,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });

  await prisma.authAuditEvent.create({
    data: {
      userId: user.id,
      clerkUserId,
      clerkSessionId,
      eventType: options.eventType ?? "request.authenticated",
      eventSource: "REQUEST",
      metadata: {
        path: getRequestPath(options.request),
        method: options.request?.method ?? null,
        ipAddress,
        userAgent,
      },
    },
  });

  return {
    appUserId: user.id,
    role: user.role,
    email: user.email,
    clerkUserId,
    clerkSessionId,
    organizationId: user.organizationId,
    organizationSlug: user.organizationSlug,
  };
}
