"use client";

import { useEffect, useState } from "react";

type Project = {
    id: string;
    name: string;
    description?: string | null;
};

type Endpoint = {
    id: string;
    name: string;
    method: string;
    url: string;
};

type TestResult = {
    id: string;
    endpointId: string;
    statusCode: number | null;
    responseTime: number;
    success: boolean;
    responseBody?: unknown;
    error?: string | null;
    bugDetected?: boolean;
    bugType?: string | null;
    bugMessage?: string | null;
    createdAt: string;
};

export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            try {
                const token = localStorage.getItem("accessToken");

                if (!token) {
                    window.location.href = "/";
                    return;
                }

                const authHeaders = {
                    Authorization: `Bearer ${token}`,
                };

                // =====================================================
                // 1. GET PROJECTS
                // =====================================================

                const projectsResponse = await fetch(
                    "http://localhost:5000/projects",
                    {
                        method: "GET",
                        headers: authHeaders,
                    },
                );

                const projectsData = await projectsResponse.json();

                if (!projectsResponse.ok) {
                    throw new Error(
                        projectsData.message ||
                            "Failed to load projects",
                    );
                }

                setProjects(projectsData);

                // =====================================================
                // 2. GET ENDPOINTS FROM ALL PROJECTS
                // =====================================================

                const allEndpoints: Endpoint[] = [];

                for (const project of projectsData as Project[]) {
                    const endpointResponse = await fetch(
                        `http://localhost:5000/projects/${project.id}/endpoints`,
                        {
                            method: "GET",
                            headers: authHeaders,
                        },
                    );

                    const endpointData =
                        await endpointResponse.json();

                    if (!endpointResponse.ok) {
                        continue;
                    }

                    allEndpoints.push(
                        ...(endpointData as Endpoint[]),
                    );
                }

                setEndpoints(allEndpoints);

                // =====================================================
                // 3. GET TEST RESULTS
                // =====================================================

                const allResults: TestResult[] = [];

                for (const project of projectsData as Project[]) {
                    const projectEndpoints =
                        allEndpoints.filter(
                            (endpoint) =>
                                endpoint.id &&
                                endpoint !== undefined,
                        );

                    for (const endpoint of projectEndpoints) {
                        const resultResponse = await fetch(
                            `http://localhost:5000/projects/${project.id}/endpoints/${endpoint.id}/results`,
                            {
                                method: "GET",
                                headers: authHeaders,
                            },
                        );

                        const resultData =
                            await resultResponse.json();

                        if (!resultResponse.ok) {
                            continue;
                        }

                        allResults.push(
                            ...(resultData as TestResult[]),
                        );
                    }
                }

                setResults(allResults);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong",
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    // =====================================================
    // DASHBOARD CALCULATIONS
    // =====================================================

    const failedTests = results.filter(
        (result) => !result.success,
    ).length;

    const passedTests = results.filter(
        (result) => result.success,
    ).length;

    const bugsDetected = results.filter(
        (result) => result.bugDetected,
    ).length;

    const recentResults = [...results]
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        )
        .slice(0, 5);

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6 text-white md:p-8">

            {/* =====================================================
                BACKGROUND GLOW
            ====================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-[-150px] top-[-150px] h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[120px]" />

                <div className="absolute right-[-150px] top-[20%] h-[450px] w-[450px] rounded-full bg-violet-600/10 blur-[120px]" />

                <div className="absolute bottom-[-200px] left-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
            </div>

            {/* =====================================================
                BACKGROUND PROJECT NAME
            ====================================================== */}

            <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
                <div className="whitespace-nowrap text-[10vw] font-black tracking-[0.18em] text-white/[0.015]">
                    AUTOAPI SENTINEL
                </div>

                <div className="absolute -rotate-6 whitespace-nowrap text-[7vw] font-black tracking-[0.2em] text-cyan-400/[0.015]">
                    AUTOAPI SENTINEL
                </div>
            </div>

            {/* =====================================================
                MAIN CONTENT
            ====================================================== */}

            <div className="relative z-10 mx-auto max-w-7xl">

                {/* =================================================
                    HEADER
                ================================================== */}

                <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-center gap-4">

                        {/* Logo */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-violet-500/10 shadow-lg shadow-cyan-500/10">
                            <span className="text-xl font-black text-cyan-400">
                                AS
                            </span>
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">
                                AutoAPI Sentinel
                            </h1>

                            <p className="mt-1 text-sm text-slate-400">
                                API Testing & Bug Discovery Dashboard
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

                        <span className="text-xs font-medium text-emerald-400">
                            Sentinel Online
                        </span>
                    </div>
                </div>

                {/* =================================================
                    LOADING
                ================================================== */}

                {loading && (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center shadow-xl backdrop-blur-xl">

                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

                        <p className="mt-4 text-sm text-slate-400">
                            Loading dashboard...
                        </p>
                    </div>
                )}

                {/* =================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-400">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>

                        {/* =============================================
                            STATISTICS
                        ============================================== */}

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                            <DashboardCard
                                title="Projects"
                                value={projects.length}
                                icon="◈"
                                accent="cyan"
                            />

                            <DashboardCard
                                title="Endpoints"
                                value={endpoints.length}
                                icon="⌁"
                                accent="blue"
                            />

                            <DashboardCard
                                title="Tests Run"
                                value={results.length}
                                icon="✓"
                                accent="violet"
                            />

                            <DashboardCard
                                title="Bugs Detected"
                                value={bugsDetected}
                                icon="⚠"
                                accent="orange"
                            />
                        </div>

                        {/* =============================================
                            EXTRA TEST SUMMARY
                        ============================================== */}

                        <div className="mt-5 grid gap-5 md:grid-cols-2">

                            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl">

                                <div className="flex items-center justify-between">

                                    <div>
                                        <p className="text-sm text-slate-400">
                                            Passed Tests
                                        </p>

                                        <p className="mt-1 text-2xl font-bold text-emerald-400">
                                            {passedTests}
                                        </p>
                                    </div>

                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-lg text-emerald-400">
                                        ✓
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl">

                                <div className="flex items-center justify-between">

                                    <div>
                                        <p className="text-sm text-slate-400">
                                            Failed Tests
                                        </p>

                                        <p className="mt-1 text-2xl font-bold text-red-400">
                                            {failedTests}
                                        </p>
                                    </div>

                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/10 text-lg text-red-400">
                                        !
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* =============================================
                            PROJECTS
                        ============================================== */}

                        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl backdrop-blur-xl">

                            {/* Header */}
                            <div className="border-b border-white/10 px-6 py-5">

                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                                    <div>
                                        <h2 className="text-xl font-semibold text-white">
                                            Your Projects
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-400">
                                            Projects created by your account
                                        </p>
                                    </div>

                                    <div className="text-xs font-medium text-cyan-400">
                                        {projects.length}{" "}
                                        {projects.length === 1
                                            ? "Project"
                                            : "Projects"}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">

                                {projects.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-10 text-center">

                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-xl text-cyan-400">
                                            ◈
                                        </div>

                                        <p className="mt-4 font-medium text-slate-300">
                                            No projects yet
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Create your first API testing project.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">

                                        {projects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="group rounded-xl border border-white/10 bg-slate-950/50 p-5 transition duration-300 hover:border-cyan-400/30 hover:bg-slate-950/80 hover:shadow-lg hover:shadow-cyan-500/5"
                                            >

                                                <div className="flex items-start justify-between gap-4">

                                                    <div>
                                                        <h3 className="font-semibold text-white">
                                                            {project.name}
                                                        </h3>

                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {project.description ||
                                                                "No description"}
                                                        </p>
                                                    </div>

                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                                                        ◈
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        (window.location.href = `/projects/${project.id}`)
                                                    }
                                                    className="mt-5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:scale-[1.02] hover:shadow-cyan-500/20"
                                                >
                                                    Open Project →
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* =============================================
                            RECENT TESTS
                        ============================================== */}

                        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl backdrop-blur-xl">

                            {/* Header */}
                            <div className="border-b border-white/10 px-6 py-5">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                    <div>
                                        <h2 className="text-xl font-semibold tracking-tight text-white">
                                            Recent Tests
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-400">
                                            Latest API test executions and detected issues
                                        </p>
                                    </div>

                                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">

                                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                                        Live test history
                                    </div>
                                </div>
                            </div>

                            {recentResults.length === 0 ? (
                                <div className="px-6 py-14 text-center">

                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/5 text-2xl text-cyan-400">
                                        🧪
                                    </div>

                                    <p className="mt-5 font-medium text-slate-300">
                                        No tests have been run yet
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Run an API test to see results here.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">

                                    <table className="w-full min-w-[950px] text-left">

                                        {/* Table Header */}
                                        <thead className="bg-slate-950/60">
                                            <tr className="border-b border-white/10">

                                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Endpoint
                                                </th>

                                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Status
                                                </th>

                                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Response Time
                                                </th>

                                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Result
                                                </th>

                                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Bug Detection
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-white/5">

                                            {recentResults.map((result) => {

                                                const endpoint =
                                                    endpoints.find(
                                                        (item) =>
                                                            item.id ===
                                                            result.endpointId,
                                                    );

                                                const responseIsSlow =
                                                    result.responseTime > 1000;

                                                return (
                                                    <tr
                                                        key={result.id}
                                                        className="group transition-colors hover:bg-white/[0.025]"
                                                    >

                                                        {/* Endpoint */}
                                                        <td className="px-6 py-5">

                                                            <div className="max-w-[320px]">

                                                                <p className="truncate font-semibold text-slate-200">
                                                                    {endpoint?.name ||
                                                                        "Unknown endpoint"}
                                                                </p>

                                                                <div className="mt-1.5 flex items-center gap-2">

                                                                    {endpoint?.method && (
                                                                        <span
                                                                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                                                endpoint.method ===
                                                                                "GET"
                                                                                    ? "bg-cyan-400/10 text-cyan-400"
                                                                                    : endpoint.method ===
                                                                                      "POST"
                                                                                    ? "bg-emerald-400/10 text-emerald-400"
                                                                                    : endpoint.method ===
                                                                                      "DELETE"
                                                                                    ? "bg-red-400/10 text-red-400"
                                                                                    : endpoint.method ===
                                                                                      "PUT"
                                                                                    ? "bg-violet-400/10 text-violet-400"
                                                                                    : "bg-slate-800 text-slate-400"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                endpoint.method
                                                                            }
                                                                        </span>
                                                                    )}

                                                                    <span className="truncate text-xs text-slate-600">
                                                                        {endpoint?.url ||
                                                                            "No URL"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Status Code */}
                                                        <td className="px-6 py-5">

                                                            {result.statusCode ? (
                                                                <span
                                                                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
                                                                        result.statusCode >=
                                                                            200 &&
                                                                        result.statusCode <
                                                                            300
                                                                            ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
                                                                            : result.statusCode >=
                                                                                300 &&
                                                                              result.statusCode <
                                                                                  400
                                                                            ? "bg-amber-400/10 text-amber-400 ring-amber-400/20"
                                                                            : "bg-red-400/10 text-red-400 ring-red-400/20"
                                                                    }`}
                                                                >
                                                                    {
                                                                        result.statusCode
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 ring-1 ring-red-400/20">
                                                                    ERROR
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Response Time */}
                                                        <td className="px-6 py-5">

                                                            <div className="flex items-center gap-2">

                                                                <span
                                                                    className={`font-semibold ${
                                                                        responseIsSlow
                                                                            ? "text-orange-400"
                                                                            : "text-slate-300"
                                                                    }`}
                                                                >
                                                                    {
                                                                        result.responseTime
                                                                    }{" "}
                                                                    ms
                                                                </span>

                                                                {responseIsSlow && (
                                                                    <span className="rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400 ring-1 ring-orange-400/10">
                                                                        Slow
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Result */}
                                                        <td className="px-6 py-5">

                                                            {result.success ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-400/20">

                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" />

                                                                    PASS
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 ring-1 ring-red-400/20">

                                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                                                                    FAIL
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Bug Detection */}
                                                        <td className="px-6 py-5">

                                                            {result.bugDetected ? (
                                                                <div className="flex flex-col gap-1.5">

                                                                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-400/10 px-3 py-1.5 text-xs font-bold text-orange-400 ring-1 ring-orange-400/20">

                                                                        <span>
                                                                            ⚠
                                                                        </span>

                                                                        BUG DETECTED
                                                                    </span>

                                                                    {result.bugType && (
                                                                        <span className="text-[11px] font-medium text-slate-500">
                                                                            {
                                                                                result.bugType
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-white/5">
                                                                    ✓ No Bug
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* =============================================
                            FOOTER
                        ============================================== */}

                        <div className="py-8 text-center">

                            <p className="text-xs text-slate-600">
                                AutoAPI Sentinel • Autonomous API Testing
                                & Bug Discovery
                            </p>

                            <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

/* =========================================================
   DASHBOARD STAT CARD
========================================================= */

function DashboardCard({
    title,
    value,
    icon,
    accent,
}: {
    title: string;
    value: number;
    icon: string;
    accent: "cyan" | "blue" | "violet" | "orange";
}) {
    const styles = {
        cyan: {
            icon: "bg-cyan-400/10 text-cyan-400",
            glow: "group-hover:border-cyan-400/30",
            number: "text-cyan-400",
        },
        blue: {
            icon: "bg-blue-400/10 text-blue-400",
            glow: "group-hover:border-blue-400/30",
            number: "text-blue-400",
        },
        violet: {
            icon: "bg-violet-400/10 text-violet-400",
            glow: "group-hover:border-violet-400/30",
            number: "text-violet-400",
        },
        orange: {
            icon: "bg-orange-400/10 text-orange-400",
            glow: "group-hover:border-orange-400/30",
            number: "text-orange-400",
        },
    };

    const current = styles[accent];

    return (
        <div
            className={`group rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl transition duration-300 ${current.glow}`}
        >
            <div className="flex items-center justify-between">

                <div>
                    <p className="text-sm text-slate-400">
                        {title}
                    </p>

                    <p
                        className={`mt-2 text-3xl font-bold ${current.number}`}
                    >
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${current.icon}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}