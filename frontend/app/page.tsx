"use client";

import {
  FormEvent,
  useState,
} from "react";

import Script from "next/script";

type Mode = "login" | "register";

export default function Home() {
  const [mode, setMode] =
    useState<Mode>("login");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // =========================
  // FORM SUBMIT
  // =========================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    // Basic validation
    if (!email || !password) {
      setMessage(
        "Please enter email and password.",
      );

      return;
    }

    if (mode === "register" && !name) {
      setMessage(
        "Please enter your name.",
      );

      return;
    }

    if (
      mode === "register" &&
      password.length < 6
    ) {
      setMessage(
        "Password must be at least 6 characters.",
      );

      return;
    }

    setLoading(true);

    try {
      // =========================
      // REGISTER
      // =========================

      if (mode === "register") {
        const response =
          await fetch(
            "http://localhost:5000/auth/register",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name,
                email,
                password,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            Array.isArray(data.message)
              ? data.message.join(", ")
              : data.message ||
                  "Registration failed",
          );
        }

        // Registration successful
        setMessage(
          "Account created successfully. Please login.",
        );

        // Switch to login
        setMode("login");

        // Keep email so user doesn't
        // need to type it again
        setPassword("");

        return;
      }

      // =========================
      // LOGIN
      // =========================

      const response =
        await fetch(
          "http://localhost:5000/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email,
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message ||
                "Login failed",
        );
      }

      // Save JWT
      localStorage.setItem(
        "accessToken",
        data.accessToken,
      );

      // Go to dashboard
      window.location.href =
        "/dashboard";
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

  // =========================
  // SWITCH LOGIN / REGISTER
  // =========================

  function switchMode(
    newMode: Mode,
  ) {
    setMode(newMode);
    setMessage("");
    setPassword("");
  }

  return (
    <>
      {/* Google script can remain here
          for future Google OAuth integration */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      {/* =========================
          GLOBAL ANIMATIONS
      ========================= */}

      <style jsx global>{`
        @keyframes autoapiLeftRight {
          0% {
            transform: translateX(-45%);
          }

          50% {
            transform: translateX(45%);
          }

          100% {
            transform: translateX(-45%);
          }
        }

        @keyframes autoapiRightLeft {
          0% {
            transform: translateX(45%);
          }

          50% {
            transform: translateX(-45%);
          }

          100% {
            transform: translateX(45%);
          }
        }

        @keyframes autoapiSlow {
          0% {
            transform: translateX(-20%);
          }

          50% {
            transform: translateX(20%);
          }

          100% {
            transform: translateX(-20%);
          }
        }

        @keyframes floatSlow {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.7;
          }
        }

        @keyframes buttonGlow {
          0%,
          100% {
            box-shadow:
              0 0 0 rgba(34, 211, 238, 0);
          }

          50% {
            box-shadow:
              0 0 35px rgba(34, 211, 238, 0.18);
          }
        }

        .autoapi-left-right {
          animation:
            autoapiLeftRight
            18s
            ease-in-out
            infinite;
        }

        .autoapi-right-left {
          animation:
            autoapiRightLeft
            24s
            ease-in-out
            infinite;
        }

        .autoapi-slow {
          animation:
            autoapiSlow
            32s
            ease-in-out
            infinite;
        }

        .float-slow {
          animation:
            floatSlow
            7s
            ease-in-out
            infinite;
        }

        .pulse-glow {
          animation:
            pulseGlow
            4s
            ease-in-out
            infinite;
        }

        .button-glow {
          animation:
            buttonGlow
            3s
            ease-in-out
            infinite;
        }
      `}</style>

      {/* =========================
          PAGE
      ========================= */}

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">

        {/* =========================
            BACKGROUND GLOWS
        ========================= */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

          <div className="absolute bottom-[-15%] right-[-10%] h-[550px] w-[550px] rounded-full bg-violet-600/10 blur-[130px]" />

          <div className="absolute left-[40%] top-[30%] h-[350px] w-[350px] rounded-full bg-blue-600/5 blur-[110px]" />

          {/* =========================
              MOVING AUTOAPI TEXT
          ========================= */}

          <div className="absolute left-0 top-[10%] w-full whitespace-nowrap opacity-[0.035]">
            <div className="autoapi-left-right text-[80px] font-black tracking-[0.2em] text-cyan-300 sm:text-[130px]">
              AUTOAPI SENTINEL
            </div>
          </div>

          <div className="absolute left-0 top-[42%] w-full whitespace-nowrap opacity-[0.025]">
            <div className="autoapi-right-left text-[70px] font-black tracking-[0.25em] text-violet-300 sm:text-[120px]">
              AUTOAPI SENTINEL
            </div>
          </div>

          <div className="absolute left-0 top-[75%] w-full whitespace-nowrap opacity-[0.025]">
            <div className="autoapi-slow text-[60px] font-black tracking-[0.25em] text-blue-300 sm:text-[110px]">
              AUTOAPI SENTINEL
            </div>
          </div>

          {/* API symbols */}

          <div className="float-slow absolute left-[8%] top-[25%] text-5xl font-bold text-cyan-400/10">
            {"{ }"}
          </div>

          <div className="float-slow absolute right-[10%] top-[20%] text-5xl font-bold text-violet-400/10">
            {"</>"}
          </div>

          <div className="float-slow absolute bottom-[20%] left-[12%] text-4xl font-bold text-blue-400/10">
            {"API"}
          </div>

          <div className="float-slow absolute bottom-[25%] right-[12%] text-4xl font-bold text-emerald-400/10">
            {"200"}
          </div>
        </div>

        {/* =========================
            LOGIN CONTAINER
        ========================= */}

        <div className="relative z-10 w-full max-w-md">

          <div className="relative w-full bg-transparent px-2 py-4 sm:px-6 sm:py-6">

            {/* Top accent */}

            <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />

            {/* Logo */}

            <div className="float-slow mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
              <div className="text-xl font-black text-cyan-300">
                API
              </div>
            </div>

            {/* Heading */}

            <div className="text-center">

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                AutoAPI{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  Sentinel
                </span>
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                Autonomous API Testing &
                Bug Discovery
              </p>

              {/* Status */}

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                System operational
              </div>
            </div>

            {/* =========================
                FORM
            ========================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* NAME */}

              {mode === "register" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Gaurav Kumar"
                    autoComplete="name"
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
                  />
                </div>
              )}

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
                />
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60"
                />
              </div>

              {/* ERROR / SUCCESS */}

              {message && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    message.toLowerCase().includes(
                      "success",
                    )
                      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                      : "border-red-400/20 bg-red-400/5 text-red-300"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* SUBMIT BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="button-glow group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition duration-300 hover:scale-[1.01] hover:shadow-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Shine */}

                <span className="absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/20 blur-md transition-all duration-700 group-hover:left-[110%]" />

                {loading ? (
                  <span className="relative flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    {mode === "login"
                      ? "Signing in..."
                      : "Creating account..."}
                  </span>
                ) : (
                  <span className="relative">
                    {mode === "login"
                      ? "Sign In"
                      : "Create Account"}
                  </span>
                )}
              </button>
            </form>

            {/* =========================
                SWITCH LOGIN / REGISTER
            ========================= */}

            <div className="mt-7 text-center text-sm text-slate-500">

              {mode === "login" ? (
                <>
                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode("register")
                    }
                    className="font-semibold text-cyan-400 transition hover:text-cyan-300"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode("login")
                    }
                    className="font-semibold text-cyan-400 transition hover:text-cyan-300"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* =========================
                SECURITY INFO
            ========================= */}

            <div className="mt-8 border-t border-white/5 pt-5 text-center">

              <p className="text-xs leading-5 text-slate-600">
                Your credentials are securely
                hashed and protected.
              </p>

              <p className="mt-2 text-[11px] text-slate-700">
                AutoAPI Sentinel • API
                Security Platform
              </p>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}