// Browser-tab favicon — same rounded, primary-blue icon chip + Truck glyph
// as the login page's logo (app/globals.css .login-logo-chip, components
// auth/LoginForm.tsx), generated instead of a static file so it can't drift
// from that color. Replaces the old static favicon.ico.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Approximates --primary (oklch(0.52 0.18 256)) — ImageResponse/satori
// doesn't support oklch(), so this is the closest standard hex equivalent.
const PRIMARY_BLUE = "#2856d6";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PRIMARY_BLUE,
          borderRadius: 7,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
