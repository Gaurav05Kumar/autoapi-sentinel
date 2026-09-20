"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem(
        "accessToken",
        data.accessToken,
      );

      window.location.href = "/dashboard";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">

      {/* =====================================================
          ANIMATED BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Main gradient glow */}
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[90px] sm:h-[500px] sm:w-[500px] sm:blur-[110px] lg:h-[600px] lg:w-[600px] lg:blur-[120px]" />

        {/* Blue glow */}
        <div className="absolute -left-24 -top-24 h-[250px] w-[250px] rounded-full bg-blue-600/20 blur-[80px] animate-pulse sm:-left-32 sm:-top-32 sm:h-[350px] sm:w-[350px] sm:blur-[100px] lg:h-[400px] lg:w-[400px]" />

        {/* Violet glow */}
        <div className="absolute -bottom-24 -right-24 h-[250px] w-[250px] rounded-full bg-violet-600/20 blur-[80px] animate-pulse sm:-bottom-32 sm:-right-32 sm:h-[350px] sm:w-[350px] sm:blur-[100px] lg:h-[400px] lg:w-[400px]" />
      </div>

      {/* =====================================================
          PROJECT NAME BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">

        {/* Large background text */}
        <div className="absolute whitespace-nowrap text-[18vw] font-black tracking-[0.08em] text-white/[0.025] animate-pulse sm:text-[14vw] sm:tracking-[0.1em] md:text-[11vw] md:tracking-[0.15em]">
          AUTOAPI SENTINEL
        </div>

        {/* Moving text layer */}
        <div className="absolute -rotate-6 whitespace-nowrap text-[13vw] font-black tracking-[0.1em] text-cyan-400/[0.035] sm:text-[10vw] sm:tracking-[0.15em] md:text-[8vw] md:tracking-[0.2em]">
          AUTOAPI SENTINEL
        </div>

        {/* Another layer */}
        <div className="absolute rotate-6 whitespace-nowrap text-[11vw] font-black tracking-[0.12em] text-violet-400/[0.035] sm:text-[8vw] sm:tracking-[0.18em] md:text-[6vw] md:tracking-[0.25em]">
          AUTOAPI SENTINEL
        </div>
      </div>

      {/* =====================================================
          ANIMATED API SYMBOLS
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block">

        <div className="absolute left-[6%] top-[18%] animate-bounce text-xs font-mono text-cyan-400/30 md:left-[10%] md:text-sm">
          {"{ status: 200 }"}
        </div>

        <div className="absolute right-[6%] top-[25%] animate-pulse text-xs font-mono text-violet-400/30 md:right-[12%] md:text-sm">
          {"GET /api/test"}
        </div>

        <div className="absolute bottom-[22%] left-[6%] animate-pulse text-xs font-mono text-blue-400/30 md:left-[12%] md:text-sm">
          {"POST /analyze"}
        </div>

        <div className="absolute bottom-[18%] right-[5%] animate-bounce text-xs font-mono text-cyan-400/30 md:right-[10%] md:text-sm">
          {"BUG_DETECTED: false"}
        </div>

        <div className="absolute left-[20%] top-[12%] h-1.5 w-1.5 rounded-full bg-cyan-400/40 shadow-[0_0_15px_4px_rgba(34,211,238,0.2)] md:left-[25%] md:h-2 md:w-2" />

        <div className="absolute bottom-[15%] right-[20%] h-1.5 w-1.5 rounded-full bg-violet-400/40 shadow-[0_0_15px_4px_rgba(167,139,250,0.2)] md:right-[25%] md:h-2 md:w-2" />
      </div>

      {/* =====================================================
          LOGIN CARD
      ====================================================== */}

      <div className="relative z-10 w-full max-w-md">

        {/* Glow behind card */}
        <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-xl sm:rounded-[28px]" />

        <div className="relative rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:rounded-[28px] sm:p-8">

          {/* Top accent */}
          <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 sm:mb-6 sm:w-16" />

          {/* Header */}
          <div className="mb-6 text-center sm:mb-8">

            {/* Logo */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-violet-500/10 shadow-lg shadow-cyan-500/10 sm:mb-5 sm:h-16 sm:w-16">
              <div className="text-xl font-black text-cyan-400 sm:text-2xl">
                AS
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              AutoAPI Sentinel
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-400 sm:text-sm sm:leading-normal">
              Autonomous API Testing & Bug Discovery
            </p>

            <div className="mx-auto mt-4 flex w-fit max-w-full items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-[11px] font-medium text-emerald-400 sm:text-xs">
                Intelligent API Monitoring
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-4 sm:space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email
              </label>

              <div className="group relative">

                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-violet-500/0 transition duration-300 group-focus-within:from-cyan-500/50 group-focus-within:via-blue-500/30 group-focus-within:to-violet-500/50" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="relative w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-transparent sm:text-base"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <div className="group relative">

                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-violet-500/0 transition duration-300 group-focus-within:from-cyan-500/50 group-focus-within:via-blue-500/30 group-focus-within:to-violet-500/50" />

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="relative w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-transparent sm:text-base"
                />
              </div>
            </div>

            {/* Error */}
            {message && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-3 text-xs leading-5 text-red-400 sm:px-4 sm:text-sm">
                {message}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:scale-[1.01] hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            >
              {/* Button shine */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <span className="relative">
                {loading ? "Signing in..." : "Sign In"}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 border-t border-white/5 pt-4 text-center sm:mt-7 sm:pt-5">
            <p className="text-[11px] text-slate-500 sm:text-xs">
              Powered by{" "}
              <span className="font-medium text-slate-400">
                AutoAPI Sentinel
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}