"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Truck } from "lucide-react";

// useSearchParams() must live inside a Suspense boundary in App Router.
// We wrap the whole form so the boundary is tight.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel — brand / marketing ───────────────────────── */}
      {/* "Midnight Depth" palette — same brand hue as --primary (256°)
          throughout, just deeper and lit rather than a flat gradient: a
          bloomed glow behind the headline/stats and a lit 2px seam against
          the sign-in panel. Always dark regardless of app theme, same as
          the persistent sidebar — this isn't meant to flip with light/dark
          mode. */}
      <div
        className="hidden md:flex md:w-1/2 flex-col px-12 py-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, oklch(0.10 0.03 259) 0%, oklch(0.155 0.06 253) 50%, oklch(0.085 0.025 261) 100%)",
        }}
      >
        {/* Bloomed radial glow, on-brand hue */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 40%, oklch(0.55 0.19 254 / 0.32) 0%, transparent 72%)",
          }}
          aria-hidden="true"
        />
        {/* Lit seam against the sign-in panel */}
        <div
          className="absolute inset-y-0 right-0 w-[2px]"
          style={{ background: "linear-gradient(90deg, transparent 0%, oklch(0.66 0.15 256 / 0.5) 100%)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-xl"
              style={{
                background: "oklch(0.52 0.18 256)",
                boxShadow: "0 0 16px oklch(0.55 0.19 254 / 0.55)",
              }}
            >
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              CargoDev
            </span>
          </div>

          {/* Tagline */}
          <div className="mt-auto mb-12">
            <h1
              className="text-4xl font-bold text-white leading-tight mb-4"
              style={{ textShadow: "0 0 30px oklch(0.55 0.19 254 / 0.35)" }}
            >
              Vehicle Import
              <br />
              Management,{" "}
              <span style={{ color: "oklch(0.78 0.12 254)" }}>simplified.</span>
            </h1>
            <p
              className="text-base leading-relaxed max-w-sm"
              style={{ color: "oklch(0.75 0.025 257)" }}
            >
              Track imported vehicles from overseas auction win to customer
              handover — all from one dashboard.
            </p>

            {/* Stats row */}
            <div className="flex gap-10 mt-10">
              <div>
                <p
                  className="text-3xl font-bold text-white"
                  style={{ textShadow: "0 0 18px oklch(0.55 0.19 254 / 0.4)" }}
                >
                  FC / FL
                </p>
                <p className="text-sm mt-0.5" style={{ color: "oklch(0.58 0.03 257)" }}>
                  Vehicle tracks
                </p>
              </div>
              <div>
                <p
                  className="text-3xl font-bold text-white"
                  style={{ textShadow: "0 0 18px oklch(0.55 0.19 254 / 0.4)" }}
                >
                  35
                </p>
                <p className="text-sm mt-0.5" style={{ color: "oklch(0.58 0.03 257)" }}>
                  Fields tracked
                </p>
              </div>
              <div>
                <p
                  className="text-3xl font-bold text-white"
                  style={{ textShadow: "0 0 18px oklch(0.55 0.19 254 / 0.4)" }}
                >
                  6–8
                </p>
                <p className="text-sm mt-0.5" style={{ color: "oklch(0.58 0.03 257)" }}>
                  Staff users
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs" style={{ color: "oklch(0.42 0.025 257)" }}>
            © {new Date().getFullYear()} Global Motors (Pvt) Ltd. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — sign-in form ────────────────────────────── */}
      {/* Unlike the left brand panel (always dark, like the sidebar), this
          side is the actual content area, so it follows the light/dark
          theme like the rest of the app — semantic tokens, not literal
          slate/blue/white/red classes. */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo — shown only on small screens */}
        <div className="flex md:hidden items-center gap-2 mb-10">
          <div className="w-9 h-9 flex items-center justify-center bg-primary rounded-xl">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-foreground font-bold text-lg">CargoDev</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Sign in to your account
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Enter your credentials to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Error alert */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@globalmotors.lk"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Hint text */}
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Contact your Administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

// Default export wraps LoginForm in a Suspense boundary.
// Required because LoginForm uses useSearchParams() which opts into CSR.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
