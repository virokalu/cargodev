import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CargoDev — Global Motors",
  description: "Vehicle import management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          their own data-* attributes onto <body> before React hydrates,
          which otherwise logs a harmless but noisy hydration-mismatch
          warning on every page load — unrelated to any app code. */}
      <body className="h-full antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
