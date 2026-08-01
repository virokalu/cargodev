import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { getOrganizationName } from "@/lib/services/organization.service";
import { env } from "@/lib/env";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const orgName = await getOrganizationName(env.ORG_ID);
  return {
    title: `CargoDev — ${orgName}`,
    description: "Vehicle import management system",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      {/* suppressHydrationWarning (both here and on <body>): next-themes reads
          the saved theme from localStorage and sets the "dark" class before
          React hydrates, and browser extensions (Grammarly, etc.) inject
          their own data-* attributes onto <body> before hydration too —
          both cause a harmless but noisy hydration-mismatch warning that's
          unrelated to any app code. */}
      <body className="h-full antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
