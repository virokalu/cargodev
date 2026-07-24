"use client";

// Header light/dark toggle. next-themes can't know the resolved theme on the
// server (it depends on localStorage/system preference, both client-only),
// so this renders a neutral placeholder until mounted rather than guessing —
// guessing would show the wrong icon for a flash on every load whose theme
// doesn't match the guess. useSyncExternalStore (rather than a
// useEffect+setState mount flag) reads "has the client hydrated" as an
// external-store subscription, matching how React wants this kind of
// server/client-diverging value handled.
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

function subscribeNoop() {
  return () => {};
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (!mounted) {
    return <div className="size-8" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
