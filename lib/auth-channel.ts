"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CHANNEL_NAME = "cargodev-auth";

export function broadcastAuthUpdate() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "auth-update" });
    channel.close();
  } catch {
    // Ignore BroadcastChannel failures; browser storage is still source of truth.
  }
}

export function useAuthChannelListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "auth-update") {
        router.refresh();
      }
    };

    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [router]);
}
