// Cloudflare R2 client — R2 implements the S3 API, so the AWS SDK v3 works
// against it unmodified (just a custom endpoint). Every upload/delete in the
// app goes through this module; nothing else should construct an S3Client.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";

export type UploadKind = "AUCTION_SHEET" | "VEHICLE_PHOTO" | "VEHICLE_DOCUMENT";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// R2_* env vars stay optional in lib/env.ts (that module is imported almost
// everywhere at startup) — this check runs lazily, only when something
// actually tries to touch storage, so an unconfigured environment can still
// boot for every page that isn't the upload path.
function requireR2Config(): void {
  const missing = (
    ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"] as const
  ).filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}. Check your .env file.`);
  }
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  requireR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

/** vehicleId is omitted while staging any upload kind during vehicle creation —
 * no vehicle row exists yet, so the object lives under a staging path instead. */
export function buildObjectKey(params: {
  orgId: string;
  vehicleId?: string;
  kind: UploadKind;
  fileName: string;
  contentType: string;
}): string {
  const ext = EXTENSION_BY_MIME[params.contentType] ?? "bin";
  const uuid = randomUUID();

  if (!params.vehicleId) {
    return `org/${params.orgId}/uploads/staging/${uuid}.${ext}`;
  }
  if (params.kind === "VEHICLE_DOCUMENT") {
    // Never trust the client's filename as a path segment as-is.
    const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 150);
    return `org/${params.orgId}/vehicles/${params.vehicleId}/documents/${uuid}-${safeName}`;
  }
  const folder = params.kind === "AUCTION_SHEET" ? "auction-sheet" : "photos";
  return `org/${params.orgId}/vehicles/${params.vehicleId}/${folder}/${uuid}.${ext}`;
}

/** Short-lived (5 min) presigned PUT URL. Signing ContentLength means R2
 * rejects the upload itself if the actual request body doesn't match the
 * size that was validated at presign time — the size cap is enforced at the
 * storage layer, not just advisory. */
export async function createPresignedPutUrl(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export function publicUrlForKey(key: string): string {
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

/** Returns null (never throws) for a URL that doesn't match our own
 * R2_PUBLIC_URL prefix, so a delete on a legacy/foreign URL can't crash
 * whatever mutation triggered it. */
export function keyFromPublicUrl(url: string): string | null {
  const prefix = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
