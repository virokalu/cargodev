import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
    // suppressHydrationWarning is required by next-themes — it sets the
    // .dark class via an inline script before React hydrates, which would
    // otherwise trip a mismatch warning on this element.
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
