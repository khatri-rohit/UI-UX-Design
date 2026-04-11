import type { ApiResponse } from "@/lib/api/types";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function requestApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error || payload.data === null) {
    throw new ApiError(
      payload.message || "Request failed",
      response.status,
      payload.code,
    );
  }

  return payload.data;
}
