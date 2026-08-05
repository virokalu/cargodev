// R2 presigned upload URLs. The browser never sends file bytes through our
// server (docs/implementation.md §6) — it asks here for a short-lived PUT
// URL, uploads directly to R2, then tells a Server Action the resulting URL
// to persist. requireUser() redirects on failure (fine for pages, wrong for
// a JSON API), so this route checks the session itself and returns real
// status codes instead.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { StaffRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { presignRequestSchema, flattenFieldErrors } from "@/lib/validation/upload.schema";
import { buildObjectKey, createPresignedPutUrl, publicUrlForKey } from "@/lib/r2";
import { getOwnedVehicle } from "@/lib/services/file.service";
import { ServiceError } from "@/lib/errors";

// Duplicated from vehicles/actions.ts's STAFF_CAN_EDIT_VEHICLE — that file
// has "use server" at the top, which only allows async function exports, so
// it can't be imported from here. Keep the two in sync if roles change.
const STAFF_CAN_UPLOAD: StaffRole[] = ["ADMINISTRATOR", "MANAGER"];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_CAN_UPLOAD.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: flattenFieldErrors(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Ownership check only when a vehicleId is present (edit-mode replace, or
  // Photos/Documents). Absent means create-time Auction Sheet staging — the
  // role check above is the only gate in that case.
  if (input.vehicleId) {
    try {
      await getOwnedVehicle(session.user.orgId, input.vehicleId);
    } catch (error) {
      if (error instanceof ServiceError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }
  }

  const key = buildObjectKey({
    orgId: session.user.orgId,
    vehicleId: input.vehicleId,
    kind: input.kind,
    fileName: input.fileName,
    contentType: input.contentType,
  });
  const uploadUrl = await createPresignedPutUrl({
    key,
    contentType: input.contentType,
    contentLength: input.fileSize,
  });

  return NextResponse.json({ uploadUrl, key, publicUrl: publicUrlForKey(key) });
}
