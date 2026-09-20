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

      localStorage.setItem("accessToken", data.accessToken);

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">

      {/* =====================================================
          ANIMATED BACKGROUND
      ====================================================== */}

      {/* Main gradient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute -left-32 -top-32 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[100px] animate-pulse" />

        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[100px] animate-pulse" />
      </div>

      {/* =====================================================
          PROJECT NAME ANIMATION
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">

        {/* Large background text */}
        <div className="absolute whitespace-nowrap text-[11vw] font-black tracking-[0.15em] text-white/[0.025] animate-pulse">
          AUTOAPI SENTINEL
        </div>

        {/* Moving text layer */}
        <div className="absolute -rotate-6 whitespace-nowrap text-[8vw] font-black tracking-[0.2em] text-cyan-400/[0.035]">
          AUTOAPI SENTINEL
        </div>

        {/* Another layer */}
        <div className="absolute rotate-6 whitespace-nowrap text-[6vw] font-black tracking-[0.25em] text-violet-400/[0.035]">
          AUTOAPI SENTINEL
        </div>
      </div>

      {/* =====================================================
          ANIMATED API SYMBOLS
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute left-[10%] top-[18%] animate-bounce text-sm font-mono text-cyan-400/30">
          {"{ status: 200 }"}
        </div>

        <div className="absolute right-[12%] top-[25%] animate-pulse text-sm font-mono text-violet-400/30">
          {"GET /api/test"}
        </div>

        <div className="absolute bottom-[22%] left-[12%] animate-pulse text-sm font-mono text-blue-400/30">
          {"POST /analyze"}
        </div>

        <div className="absolute bottom-[18%] right-[10%] animate-bounce text-sm font-mono text-cyan-400/30">
          {"BUG_DETECTED: false"}
        </div>

        <div className="absolute left-[25%] top-[12%] h-2 w-2 rounded-full bg-cyan-400/40 shadow-[0_0_20px_5px_rgba(34,211,238,0.2)]" />

        <div className="absolute right-[25%] bottom-[15%] h-2 w-2 rounded-full bg-violet-400/40 shadow-[0_0_20px_5px_rgba(167,139,250,0.2)]" />
      </div>

      {/* =====================================================
          LOGIN CARD
      ====================================================== */}

      <div className="relative z-10 w-full max-w-md">

        {/* Glow behind card */}
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-xl" />

        <div className="relative rounded-[28px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">

          {/* Top accent */}
          <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />

          {/* Header */}
          <div className="mb-8 text-center">

            {/* Logo */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-violet-500/10 shadow-lg shadow-cyan-500/10">
              <div className="text-2xl font-black text-cyan-400">
                AS
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              AutoAPI Sentinel
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Autonomous API Testing & Bug Discovery
            </p>

            <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                Intelligent API Monitoring
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">

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
                  className="relative w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none transition focus:border-transparent"
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
                  className="relative w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none transition focus:border-transparent"
                />
              </div>
            </div>

            {/* Error */}
            {message && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {message}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:scale-[1.01] hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* Button shine */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <span className="relative">
                {loading ? "Signing in..." : "Sign In"}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 border-t border-white/5 pt-5 text-center">
            <p className="text-xs text-slate-500">
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