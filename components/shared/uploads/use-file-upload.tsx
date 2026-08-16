"use client";

// Shared presign-fetch + PUT-to-R2 logic for every upload widget in
// components/shared/uploads/ — one implementation, not copy-pasted per
// widget. XHR (not fetch) is used for the PUT specifically because it's the
// only way to get real upload progress events.

import { useState } from "react";
import type { UploadKind } from "@/lib/r2";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

async function requestPresignedUpload(params: {
  vehicleId?: string;
  kind: UploadKind;
  file: File;
  signal?: AbortSignal;
}): Promise<PresignedUpload> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleId: params.vehicleId,
      kind: params.kind,
      fileName: params.file.name,
      contentType: params.file.type,
      fileSize: params.file.size,
    }),
    signal: params.signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not start upload.");
  }
  return res.json();
}

function putFileToR2(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload to storage failed."));
    };
    xhr.onerror = () => reject(new Error("Upload to storage failed."));
    // Aborts the in-flight PUT the moment the caller's signal fires (e.g. a
    // React Strict Mode dev double-render tearing down the phantom first
    // mount) so we don't ship the same file to R2 twice per selection.
    xhr.onabort = () => reject(new DOMException("Upload aborted.", "AbortError"));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

export function useFileUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    file: File,
    params: { vehicleId?: string; kind: UploadKind },
    signal?: AbortSignal
  ): Promise<string> {
    setStatus("uploading");
    setProgress(0);
    setError(null);
    try {
      const presigned = await requestPresignedUpload({ ...params, file, signal });
      await putFileToR2(presigned.uploadUrl, file, setProgress, signal);
      setStatus("done");
      return presigned.publicUrl;
    } catch (e) {
      // An aborted upload (e.g. Strict Mode's dev-only phantom mount getting
      // torn down) isn't a real failure — don't flash an error state for it.
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed.");
      throw e;
    }
  }

  return { status, progress, error, upload };
}
