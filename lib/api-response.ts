// Shared response shaping for every /api/v1/* Route Handler. This is the
// mapping lib/errors.ts's own header comment anticipates ("JSON status codes
// for the future mobile API") but never built — one place so no route file
// re-implements its own catch block or forgets a status code.

import { NextResponse } from "next/server";
import { ServiceError, type ServiceErrorCode } from "@/lib/errors";

export const SERVICE_ERROR_STATUS: Record<ServiceErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};

// Authenticated, org-scoped data must never be cached by a shared cache or
// the client — every response (success or error) carries this.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: NO_STORE_HEADERS });
}

/**
 * Maps a thrown error to a JSON error response.
 * - ServiceError -> its mapped status code, with the message and any
 *   field errors (e.g. from a failed zod parse — routes wrap that in a
 *   ServiceError("VALIDATION", ...) before calling this).
 * - Anything else is unexpected: logged server-side, never leaked to the
 *   client as a raw message (could contain internal detail), returned as a
 *   generic 500.
 */
export function apiError(error: unknown): NextResponse {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
      { status: SERVICE_ERROR_STATUS[error.code], headers: NO_STORE_HEADERS }
    );
  }

  console.error("[api/v1] unexpected error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong." } },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

/** Guard-level 401 — not a ServiceError, since there's no "unauthenticated"
 * ServiceErrorCode by design (services only ever run for an already-
 * authenticated actor; only the guard layer can be unauthenticated). */
export function apiUnauthenticated(message = "Authentication required."): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message } },
    { status: 401, headers: NO_STORE_HEADERS }
  );
}
