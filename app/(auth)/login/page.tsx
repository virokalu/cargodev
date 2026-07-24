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
      rememberMe,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Invalid email or password. Please try again.");
      return;
    }

    try {
      await fetch("/api/auth/remember-me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rememberMe }),
      });
    } catch {
      // The JWT expiry is still the authoritative ceiling, so this is best-effort.
    }

    setLoading(false);
    router.push(callbackUrl);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel — brand / marketing ───────────────────────── */}
      <div
        className="hidden md:flex md:w-1/2 flex-col px-12 py-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, #0a1628 0%, #0f2444 40%, #0d1f3a 100%)",
        }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 50%, #1e4080 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-xl shadow-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              CargoDev
            </span>
          </div>

          {/* Tagline */}
          <div className="mt-auto mb-12">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Vehicle Import
              <br />
              Management,{" "}
              <span className="text-blue-400">simplified.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Track imported vehicles from overseas auction win to customer
              handover — all from one dashboard.
            </p>

            {/* Stats row */}
            <div className="flex gap-10 mt-10">
              <div>
                <p className="text-3xl font-bold text-white">FC / FL</p>
                <p className="text-slate-400 text-sm mt-0.5">Vehicle tracks</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">35</p>
                <p className="text-slate-400 text-sm mt-0.5">Fields tracked</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">6–8</p>
                <p className="text-slate-400 text-sm mt-0.5">Staff users</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Global Motors (Pvt) Ltd. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — sign-in form ────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo — shown only on small screens */}
        <div className="flex md:hidden items-center gap-2 mb-10">
          <div className="w-9 h-9 flex items-center justify-center bg-blue-600 rounded-xl">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-lg">CargoDev</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Sign in to your account
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Enter your credentials to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Error alert */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@globalmotors.lk"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Hint text */}
          <p className="mt-6 text-xs text-center text-slate-400">
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
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
