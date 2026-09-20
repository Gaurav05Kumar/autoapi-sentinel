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
    projectId?: string;
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

type Analytics = {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    bugsDetected: number;
    successRate: number;
    bugTypes: Record<string, number>;
};

export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);

    const [analytics, setAnalytics] = useState<Analytics>({
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        bugsDetected: 0,
        successRate: 0,
        bugTypes: {},
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =============================================================
    // LOAD DASHBOARD DATA
    // =============================================================

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                // -------------------------------------------------
                // AUTH TOKEN
                // -------------------------------------------------

                const token =
                    localStorage.getItem("accessToken");

                if (!token) {
                    window.location.href = "/";
                    return;
                }

                const authHeaders = {
                    Authorization: `Bearer ${token}`,
                };

                // -------------------------------------------------
                // GET PROJECTS
                // -------------------------------------------------

                const projectsResponse = await fetch(
                    "http://localhost:5000/projects",
                    {
                        method: "GET",
                        headers: authHeaders,
                    }
                );

                const projectsData =
                    await projectsResponse.json();

                if (!projectsResponse.ok) {
                    throw new Error(
                        projectsData.message ||
                            "Failed to load projects"
                    );
                }

                const projectList =
                    projectsData as Project[];

                setProjects(projectList);

                // -------------------------------------------------
                // STORAGE
                // -------------------------------------------------

                const allEndpoints: Endpoint[] = [];
                const allResults: TestResult[] = [];

                let totalTests = 0;
                let passedTests = 0;
                let failedTests = 0;
                let bugsDetected = 0;

                const bugTypes: Record<string, number> = {};

                // -------------------------------------------------
                // PROCESS EACH PROJECT
                // -------------------------------------------------

                for (const project of projectList) {
                    // =============================================
                    // GET PROJECT ENDPOINTS
                    // =============================================

                    const endpointResponse =
                        await fetch(
                            `http://localhost:5000/projects/${project.id}/endpoints`,
                            {
                                method: "GET",
                                headers: authHeaders,
                            }
                        );

                    let projectEndpoints: Endpoint[] = [];

                    if (endpointResponse.ok) {
                        const endpointData =
                            await endpointResponse.json();

                        projectEndpoints =
                            endpointData as Endpoint[];

                        allEndpoints.push(
                            ...projectEndpoints.map(
                                (endpoint) => ({
                                    ...endpoint,
                                    projectId: project.id,
                                })
                            )
                        );
                    }

                    // =============================================
                    // GET RESULTS FOR THIS PROJECT ONLY
                    // =============================================

                    for (const endpoint of projectEndpoints) {
                        const resultResponse =
                            await fetch(
                                `http://localhost:5000/projects/${project.id}/endpoints/${endpoint.id}/results`,
                                {
                                    method: "GET",
                                    headers: authHeaders,
                                }
                            );

                        if (!resultResponse.ok) {
                            continue;
                        }

                        const resultData =
                            await resultResponse.json();

                        allResults.push(
                            ...(resultData as TestResult[])
                        );
                    }

                    // =============================================
                    // ANALYTICS
                    // =============================================

                    const analyticsResponse =
                        await fetch(
                            `http://localhost:5000/projects/${project.id}/endpoints/analytics`,
                            {
                                method: "GET",
                                headers: authHeaders,
                            }
                        );

                    if (analyticsResponse.ok) {
                        const projectAnalytics =
                            (await analyticsResponse.json()) as Analytics;

                        totalTests +=
                            projectAnalytics.totalTests || 0;

                        passedTests +=
                            projectAnalytics.passedTests || 0;

                        failedTests +=
                            projectAnalytics.failedTests || 0;

                        bugsDetected +=
                            projectAnalytics.bugsDetected || 0;

                        Object.entries(
                            projectAnalytics.bugTypes || {}
                        ).forEach(
                            ([bugType, count]) => {
                                bugTypes[bugType] =
                                    (bugTypes[bugType] || 0) +
                                    Number(count);
                            }
                        );
                    }
                }

                // -------------------------------------------------
                // SUCCESS RATE
                // -------------------------------------------------

                const successRate =
                    totalTests > 0
                        ? Number(
                              (
                                  (passedTests /
                                      totalTests) *
                                  100
                              ).toFixed(1)
                          )
                        : 0;

                // -------------------------------------------------
                // SAVE DATA
                // -------------------------------------------------

                setEndpoints(allEndpoints);
                setResults(allResults);

                setAnalytics({
                    totalTests,
                    passedTests,
                    failedTests,
                    bugsDetected,
                    successRate,
                    bugTypes,
                });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    // =============================================================
    // RECENT RESULTS
    // =============================================================

    const recentResults = [...results]
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        )
        .slice(0, 5);

    // =============================================================
    // RENDER
    // =============================================================

    return (
        <main className="min-h-screen bg-[#020617] px-4 py-6 text-white sm:px-6 md:p-8">

            {/* =====================================================
                BACKGROUND GLOW
            ====================================================== */}

            <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">

                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

                <div className="absolute right-[-120px] top-[20%] h-96 w-96 rounded-full bg-violet-600/10 blur-[130px]" />

                <div className="absolute bottom-[-150px] left-[35%] h-96 w-96 rounded-full bg-blue-600/5 blur-[130px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">

                {/* =================================================
                    HEADER
                ================================================== */}

                <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.12)]">

                                <span className="text-lg text-cyan-400">
                                    ◈
                                </span>

                            </div>

                            <div>

                                <h1 className="text-3xl font-bold tracking-tight text-white">
                                    AutoAPI{" "}
                                    <span className="text-cyan-400">
                                        Sentinel
                                    </span>
                                </h1>

                                <p className="mt-1 text-sm text-slate-400">
                                    API Testing & Bug Discovery Dashboard
                                </p>

                            </div>

                        </div>
                    </div>

                    {/* ONLINE STATUS */}

                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 shadow-[0_0_20px_rgba(16,185,129,0.08)]">

                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                        <span className="text-xs font-semibold text-emerald-400">
                            Sentinel Online
                        </span>

                    </div>
                </header>

                {/* =================================================
                    LOADING
                ================================================== */}

                {loading && (
                    <GlassCard className="p-12 text-center">

                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]" />

                        <p className="mt-5 text-sm text-slate-400">
                            Loading dashboard...
                        </p>

                    </GlassCard>
                )}

                {/* =================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.06)]">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>

                        {/* =================================================
                            MAIN STATS
                        ================================================== */}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                            <DashboardCard
                                title="Projects"
                                value={projects.length}
                                icon="◈"
                                iconColor="cyan"
                            />

                            <DashboardCard
                                title="Endpoints"
                                value={endpoints.length}
                                icon="⌁"
                                iconColor="blue"
                            />

                            <DashboardCard
                                title="Tests Run"
                                value={analytics.totalTests}
                                icon="◉"
                                iconColor="violet"
                            />

                            <DashboardCard
                                title="Bugs Detected"
                                value={analytics.bugsDetected}
                                icon="⚠"
                                iconColor="orange"
                            />

                        </div>

                        {/* =================================================
                            SUMMARY
                        ================================================== */}

                        <div className="mt-4 grid gap-4 md:grid-cols-3">

                            <SummaryCard
                                title="Passed Tests"
                                value={analytics.passedTests}
                                type="success"
                            />

                            <SummaryCard
                                title="Failed Tests"
                                value={analytics.failedTests}
                                type="danger"
                            />

                            <SummaryCard
                                title="Success Rate"
                                value={`${analytics.successRate}%`}
                                type="primary"
                            />

                        </div>

                        {/* =================================================
                            ANALYTICS
                        ================================================== */}

                        <GlassCard className="mt-8 overflow-hidden">

                            <div className="border-b border-white/10 px-6 py-5">

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                    <div>

                                        <h2 className="text-xl font-semibold text-white">
                                            Test Analytics
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            API testing performance and detected
                                            bug statistics
                                        </p>

                                    </div>

                                    <span className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-400">
                                        Analytics
                                    </span>

                                </div>
                            </div>

                            <div className="p-6">

                                <div className="grid gap-5 md:grid-cols-2">

                                    {/* SUCCESS RATE */}

                                    <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">

                                        <div className="flex items-center justify-between">

                                            <div>

                                                <p className="text-sm text-slate-500">
                                                    Overall Success Rate
                                                </p>

                                                <p className="mt-2 text-4xl font-bold text-white">
                                                    {analytics.successRate}
                                                    <span className="text-cyan-400">
                                                        %
                                                    </span>
                                                </p>

                                            </div>

                                            <div className="text-right text-xs">

                                                <p className="text-emerald-400">
                                                    {analytics.passedTests}{" "}
                                                    passed
                                                </p>

                                                <p className="mt-1 text-red-400">
                                                    {analytics.failedTests}{" "}
                                                    failed
                                                </p>

                                            </div>

                                        </div>

                                        {/* PROGRESS */}

                                        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">

                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all duration-700"
                                                style={{
                                                    width: `${Math.min(
                                                        Math.max(
                                                            analytics.successRate,
                                                            0
                                                        ),
                                                        100
                                                    )}%`,
                                                }}
                                            />

                                        </div>

                                    </div>

                                    {/* BUG BREAKDOWN */}

                                    <div className="rounded-2xl border border-violet-400/10 bg-slate-950/70 p-5">

                                        <div className="mb-4">

                                            <p className="text-sm text-slate-400">
                                                Bug Breakdown
                                            </p>

                                            <p className="mt-1 text-xs text-slate-600">
                                                Detected issue types
                                            </p>

                                        </div>

                                        {Object.keys(
                                            analytics.bugTypes
                                        ).length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">

                                                <p className="text-sm text-slate-500">
                                                    No bugs detected yet.
                                                </p>

                                            </div>
                                        ) : (
                                            <div className="space-y-3">

                                                {Object.entries(
                                                    analytics.bugTypes
                                                )
                                                    .sort(
                                                        (
                                                            [, a],
                                                            [, b]
                                                        ) => b - a
                                                    )
                                                    .map(
                                                        ([
                                                            bugType,
                                                            count,
                                                        ]) => (
                                                            <div
                                                                key={
                                                                    bugType
                                                                }
                                                                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/70 px-4 py-3"
                                                            >

                                                                <div className="flex items-center gap-3">

                                                                    <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" />

                                                                    <span className="text-sm font-medium text-slate-300">
                                                                        {
                                                                            bugType
                                                                        }
                                                                    </span>

                                                                </div>

                                                                <span className="rounded-lg border border-orange-400/20 bg-orange-400/5 px-3 py-1 text-xs font-bold text-orange-400">
                                                                    {
                                                                        count
                                                                    }
                                                                </span>

                                                            </div>
                                                        )
                                                    )}

                                            </div>
                                        )}

                                    </div>

                                </div>
                            </div>

                        </GlassCard>

                        {/* =================================================
                            PROJECTS
                        ================================================== */}

                        <GlassCard className="mt-8 overflow-hidden">

                            <div className="border-b border-white/10 px-6 py-5">

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                    <div>

                                        <h2 className="text-xl font-semibold text-white">
                                            Your Projects
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Projects created by your account
                                        </p>

                                    </div>

                                    <span className="rounded-full border border-blue-400/20 bg-blue-400/5 px-3 py-1 text-xs font-medium text-blue-400">
                                        {projects.length}{" "}
                                        {projects.length === 1
                                            ? "Project"
                                            : "Projects"}
                                    </span>

                                </div>
                            </div>

                            <div className="p-6">

                                {projects.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">

                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/5 text-xl text-cyan-400">
                                            ◈
                                        </div>

                                        <p className="mt-4 font-medium text-slate-300">
                                            No projects yet
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                            Create your first API testing
                                            project.
                                        </p>

                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">

                                        {projects.map(
                                            (project) => (
                                                <div
                                                    key={
                                                        project.id
                                                    }
                                                    className="group rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(34,211,238,0.07)]"
                                                >

                                                    <div className="flex items-start justify-between gap-4">

                                                        <div>

                                                            <h3 className="font-semibold text-white">
                                                                {
                                                                    project.name
                                                                }
                                                            </h3>

                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {project.description ||
                                                                    "No description"}
                                                            </p>

                                                        </div>

                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/5 text-violet-400">
                                                            ◈
                                                        </div>

                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            (window.location.href =
                                                                `/projects/${project.id}`)
                                                        }
                                                        className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.18)] transition hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.3)]"
                                                    >
                                                        Open Project →
                                                    </button>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            </div>

                        </GlassCard>

                        {/* =================================================
                            RECENT TESTS
                        ================================================== */}

                        <GlassCard className="mt-8 overflow-hidden">

                            <div className="border-b border-white/10 px-6 py-5">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                    <div>

                                        <h2 className="text-xl font-semibold text-white">
                                            Recent Tests
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Latest API test executions and
                                            detected issues
                                        </p>

                                    </div>

                                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">

                                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

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

                                    <p className="mt-1 text-sm text-slate-600">
                                        Run an API test to see results here.
                                    </p>

                                </div>
                            ) : (
                                <div className="overflow-x-auto">

                                    <table className="w-full min-w-[950px] text-left">

                                        <thead className="bg-slate-950/80">

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

                                            {recentResults.map(
                                                (result) => {

                                                    const endpoint =
                                                        endpoints.find(
                                                            (item) =>
                                                                item.id ===
                                                                result.endpointId
                                                        );

                                                    const responseIsSlow =
                                                        result.responseTime >
                                                        1000;

                                                    return (
                                                        <tr
                                                            key={
                                                                result.id
                                                            }
                                                            className="transition hover:bg-cyan-400/[0.025]"
                                                        >

                                                            {/* ENDPOINT */}

                                                            <td className="px-6 py-5">

                                                                <div className="max-w-[320px]">

                                                                    <p className="truncate font-semibold text-slate-200">
                                                                        {endpoint?.name ||
                                                                            "Unknown endpoint"}
                                                                    </p>

                                                                    <div className="mt-2 flex items-center gap-2">

                                                                        {endpoint?.method && (
                                                                            <span className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
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

                                                            {/* STATUS */}

                                                            <td className="px-6 py-5">

                                                                {result.statusCode ? (
                                                                    <span
                                                                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${
                                                                            result.statusCode >=
                                                                                200 &&
                                                                            result.statusCode <
                                                                                300
                                                                                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                                                                                : result.statusCode >=
                                                                                      300 &&
                                                                                  result.statusCode <
                                                                                      400
                                                                                ? "border-orange-400/20 bg-orange-400/5 text-orange-400"
                                                                                : "border-red-400/20 bg-red-400/5 text-red-400"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            result.statusCode
                                                                        }
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-bold text-red-400">
                                                                        ERROR
                                                                    </span>
                                                                )}

                                                            </td>

                                                            {/* RESPONSE TIME */}

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
                                                                        <span className="rounded-full border border-orange-400/20 bg-orange-400/5 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                                                                            Slow
                                                                        </span>
                                                                    )}

                                                                </div>

                                                            </td>

                                                            {/* RESULT */}

                                                            <td className="px-6 py-5">

                                                                {result.success ? (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-bold text-emerald-400">

                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]" />

                                                                        PASS

                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-bold text-red-400">

                                                                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_7px_rgba(248,113,113,0.8)]" />

                                                                        FAIL

                                                                    </span>
                                                                )}

                                                            </td>

                                                            {/* BUG */}

                                                            <td className="px-6 py-5">

                                                                {result.bugDetected ? (
                                                                    <div className="flex flex-col gap-1.5">

                                                                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/5 px-3 py-1.5 text-xs font-bold text-orange-400">

                                                                            <span>
                                                                                ⚠
                                                                            </span>

                                                                            BUG
                                                                            DETECTED

                                                                        </span>

                                                                        {result.bugType && (
                                                                            <span className="text-[11px] font-medium text-slate-600">
                                                                                {
                                                                                    result.bugType
                                                                                }
                                                                            </span>
                                                                        )}

                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-500">
                                                                        ✓ No
                                                                        Bug
                                                                    </span>
                                                                )}

                                                            </td>

                                                        </tr>
                                                    );
                                                }
                                            )}

                                        </tbody>

                                    </table>

                                </div>
                            )}

                        </GlassCard>

                        {/* =================================================
                            FOOTER
                        ================================================== */}

                        <footer className="py-8 text-center">

                            <p className="text-xs text-slate-600">
                                AutoAPI Sentinel • Autonomous API Testing
                                & Bug Discovery
                            </p>

                            <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

                        </footer>

                    </>
                )}

            </div>
        </main>
    );
}

/* =============================================================
   GLASS CARD
============================================================= */

function GlassCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`border border-white/10 bg-slate-900/50 shadow-[0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl ${className}`}
        >
            {children}
        </div>
    );
}

/* =============================================================
   DASHBOARD CARD
============================================================= */

function DashboardCard({
    title,
    value,
    icon,
    iconColor,
}: {
    title: string;
    value: number;
    icon: string;
    iconColor: "cyan" | "blue" | "violet" | "orange";
}) {
    const colors = {
        cyan: {
            box: "border-cyan-400/20 bg-cyan-400/5",
            text: "text-cyan-400",
            glow: "shadow-[0_0_25px_rgba(34,211,238,0.08)]",
        },
        blue: {
            box: "border-blue-400/20 bg-blue-400/5",
            text: "text-blue-400",
            glow: "shadow-[0_0_25px_rgba(59,130,246,0.08)]",
        },
        violet: {
            box: "border-violet-400/20 bg-violet-400/5",
            text: "text-violet-400",
            glow: "shadow-[0_0_25px_rgba(139,92,246,0.08)]",
        },
        orange: {
            box: "border-orange-400/20 bg-orange-400/5",
            text: "text-orange-400",
            glow: "shadow-[0_0_25px_rgba(251,146,60,0.08)]",
        },
    };

    const color = colors[iconColor];

    return (
        <div
            className={`group rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 ${color.glow}`}
        >

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-sm text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                        {value}
                    </p>

                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${color.box} ${color.text}`}
                >
                    {icon}
                </div>

            </div>

        </div>
    );
}

/* =============================================================
   SUMMARY CARD
============================================================= */

function SummaryCard({
    title,
    value,
    type,
}: {
    title: string;
    value: number | string;
    type: "success" | "danger" | "primary";
}) {
    const styles = {
        success: {
            border: "border-emerald-400/20",
            bg: "bg-emerald-400/5",
            text: "text-emerald-400",
            glow: "shadow-[0_0_25px_rgba(16,185,129,0.06)]",
        },
        danger: {
            border: "border-red-400/20",
            bg: "bg-red-400/5",
            text: "text-red-400",
            glow: "shadow-[0_0_25px_rgba(239,68,68,0.06)]",
        },
        primary: {
            border: "border-cyan-400/20",
            bg: "bg-cyan-400/5",
            text: "text-cyan-400",
            glow: "shadow-[0_0_25px_rgba(34,211,238,0.06)]",
        },
    };

    const style = styles[type];

    return (
        <div
            className={`rounded-2xl border ${style.border} ${style.bg} p-5 backdrop-blur-xl ${style.glow}`}
        >

            <p className="text-sm text-slate-500">
                {title}
            </p>

            <p
                className={`mt-2 text-2xl font-bold ${style.text}`}
            >
                {value}
            </p>

        </div>
    );
}