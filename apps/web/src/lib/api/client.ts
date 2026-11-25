import { z } from "zod";

/**
 * Browser → API, always same-origin through the /api/v1 proxy (decision 003).
 * Every failure becomes an ApiError with the API's one shape { code, message, field? },
 * so screens choose a DESIGN.md surface by `code` and never parse raw responses.
 *
 * Hand-written for now; replaced by openapi-fetch over generated types when
 * packages/api-types arrives (FRONTEND.md §5).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR = "network_error";

const errorBody = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  accessToken?: string;
};

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T> | null,
  { method = "GET", body, headers = {}, accessToken }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      NETWORK_ERROR,
      "Can't reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const parsed = errorBody.safeParse(await response.json().catch(() => null));
    if (parsed.success) {
      const { code, message, field } = parsed.data;
      throw new ApiError(response.status, code, message, field);
    }
    throw new ApiError(
      response.status,
      "unexpected_response",
      "Something went wrong on our side. Try again.",
    );
  }

  if (schema === null) return undefined as T;
  return schema.parse(await response.json());
}

/** Any thrown value as an ApiError, so catch blocks have one thing to handle. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, "unexpected_error", "Something went wrong. Try again.");
}
