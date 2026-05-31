"use client";

export type ApiErrorPayload = {
  error?: string;
  issues?: string[];
};

export type ErrorWithIssues = Error & {
  issues?: Array<{ message: string }>;
  status?: number;
};

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }

  if (configuredBaseUrl.length === 0) {
    return window.location.origin;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl);
    const hostname = configuredUrl.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return window.location.origin;
    }
  } catch {
    return window.location.origin;
  }

  return configuredBaseUrl;
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl.length > 0 ? `${baseUrl}${path}` : path;
}

export async function createApiError(response: Response, fallbackMessage: string): Promise<ErrorWithIssues> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const message = typeof payload?.error === "string" && payload.error.length > 0 ? payload.error : fallbackMessage;
  const error = new Error(message) as ErrorWithIssues;
  error.status = response.status;

  if (Array.isArray(payload?.issues)) {
    const issues = payload.issues
      .filter((issue): issue is string => typeof issue === "string" && issue.length > 0)
      .map((issueMessage) => ({ message: issueMessage }));

    if (issues.length > 0) {
      error.issues = issues;
    }
  }

  return error;
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw await createApiError(response, fallbackMessage);
  }

  return (await response.json()) as T;
}
