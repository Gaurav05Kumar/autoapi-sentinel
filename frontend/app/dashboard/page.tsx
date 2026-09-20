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
                                    projectId:
                                        project.id,
                                })
                            )
                        );
                    }

                    // =============================================
                    // GET RESULTS FOR THIS PROJECT ONLY
                    // =============================================

                    for (
                        const endpoint of projectEndpoints
                    ) {
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
                            projectAnalytics.totalTests ||
                            0;

                        passedTests +=
                            projectAnalytics.passedTests ||
                            0;

                        failedTests +=
                            projectAnalytics.failedTests ||
                            0;

                        bugsDetected +=
                            projectAnalytics.bugsDetected ||
                            0;

                        Object.entries(
                            projectAnalytics.bugTypes ||
                                {}
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
        <main className="min-h-screen overflow-x-hidden bg-[#020617] px-3 py-5 text-white sm:px-5 sm:py-6 md:px-8 md:py-8">

            {/* =====================================================
                BACKGROUND GLOW
            ====================================================== */}

            <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">

                <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px] sm:-left-32 sm:-top-32 sm:h-80 sm:w-80 sm:blur-[110px] md:h-96 md:w-96 md:blur-[120px]" />

                <div className="absolute -right-24 top-[20%] h-64 w-64 rounded-full bg-violet-600/10 blur-[100px] sm:-right-28 sm:h-80 sm:w-80 sm:blur-[115px] md:right-[-120px] md:h-96 md:w-96 md:blur-[130px]" />

                <div className="absolute -bottom-24 left-[20%] h-64 w-64 rounded-full bg-blue-600/5 blur-[100px] sm:-bottom-32 sm:left-[30%] sm:h-80 sm:w-80 md:bottom-[-150px] md:left-[35%] md:h-96 md:w-96 md:blur-[130px]" />

            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl">

                {/* =================================================
                    HEADER
                ================================================== */}

                <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                        <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.12)] sm:h-10 sm:w-10">

                                <span className="text-lg text-cyan-400">
                                    ◈
                                </span>

                            </div>

                            <div className="min-w-0">

                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    AutoAPI{" "}
                                    <span className="text-cyan-400">
                                        Sentinel
                                    </span>
                                </h1>

                                <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-400 sm:max-w-none sm:text-sm sm:leading-normal">
                                    API Testing & Bug Discovery
                                    Dashboard
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* ONLINE STATUS */}

                    <div className="flex w-fit items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 shadow-[0_0_20px_rgba(16,185,129,0.08)] sm:self-auto sm:px-4 sm:py-2">

                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                        <span className="text-[11px] font-semibold text-emerald-400 sm:text-xs">
                            Sentinel Online
                        </span>

                    </div>
                </header>

                {/* =================================================
                    LOADING
                ================================================== */}

                {loading && (
                    <GlassCard className="p-8 text-center sm:p-12">

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
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.06)] sm:p-5">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>

                        {/* =================================================
                            MAIN STATS
                        ================================================= */}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">

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
                        ================================================= */}

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">

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
                        ================================================= */}

                        <GlassCard className="mt-6 overflow-hidden sm:mt-8">

                            <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                    <div className="min-w-0">

                                        <h2 className="text-lg font-semibold text-white sm:text-xl">
                                            Test Analytics
                                        </h2>

                                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-normal">
                                            API testing performance and
                                            detected bug statistics
                                        </p>

                                    </div>

                                    <span className="w-fit shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-400">
                                        Analytics
                                    </span>

                                </div>
                            </div>

                            <div className="p-4 sm:p-6">

                                <div className="grid gap-4 md:grid-cols-2 md:gap-5">

                                    {/* SUCCESS RATE */}

                                    <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">

                                        <div className="flex items-start justify-between gap-4">

                                            <div>

                                                <p className="text-sm text-slate-500">
                                                    Overall Success Rate
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-white sm:text-4xl">
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

                                    <div className="rounded-2xl border border-violet-400/10 bg-slate-950/70 p-4 sm:p-5">

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
                                                                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/70 px-3 py-3 sm:px-4"
                                                            >

                                                                <div className="flex min-w-0 items-center gap-3">

                                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" />

                                                                    <span className="truncate text-sm font-medium text-slate-300">
                                                                        {
                                                                            bugType
                                                                        }
                                                                    </span>

                                                                </div>

                                                                <span className="shrink-0 rounded-lg border border-orange-400/20 bg-orange-400/5 px-2.5 py-1 text-xs font-bold text-orange-400 sm:px-3">
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
                        ================================================= */}

                        <GlassCard className="mt-6 overflow-hidden sm:mt-8">

                            <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                    <div className="min-w-0">

                                        <h2 className="text-lg font-semibold text-white sm:text-xl">
                                            Your Projects
                                        </h2>

                                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                                            Projects created by your account
                                        </p>

                                    </div>

                                    <span className="w-fit shrink-0 rounded-full border border-blue-400/20 bg-blue-400/5 px-3 py-1 text-xs font-medium text-blue-400">
                                        {projects.length}{" "}
                                        {projects.length === 1
                                            ? "Project"
                                            : "Projects"}
                                    </span>

                                </div>
                            </div>

                            <div className="p-4 sm:p-6">

                                {projects.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center sm:p-10">

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
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">

                                        {projects.map(
                                            (project) => (
                                                <div
                                                    key={
                                                        project.id
                                                    }
                                                    className="group min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(34,211,238,0.07)] sm:p-5"
                                                >

                                                    <div className="flex items-start justify-between gap-3">

                                                        <div className="min-w-0">

                                                            <h3 className="truncate font-semibold text-white">
                                                                {
                                                                    project.name
                                                                }
                                                            </h3>

                                                            <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                                                                {project.description ||
                                                                    "No description"}
                                                            </p>

                                                        </div>

                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/5 text-violet-400 sm:h-10 sm:w-10">
                                                            ◈
                                                        </div>

                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            (window.location.href =
                                                                `/projects/${project.id}`)
                                                        }
                                                        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.18)] transition hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.3)] sm:w-auto"
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
                        ================================================= */}

                        <GlassCard className="mt-6 overflow-hidden sm:mt-8">

                            <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                    <div className="min-w-0">

                                        <h2 className="text-lg font-semibold text-white sm:text-xl">
                                            Recent Tests
                                        </h2>

                                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
                                            Latest API test executions and
                                            detected issues
                                        </p>

                                    </div>

                                    <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[11px] font-medium text-emerald-400 sm:text-xs">

                                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

                                        Live test history

                                    </div>

                                </div>

                            </div>

                            {recentResults.length === 0 ? (
                                <div className="px-4 py-12 text-center sm:px-6 sm:py-14">

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
                                <>
                                    {/* =================================================
                                        DESKTOP TABLE
                                    ================================================== */}

                                    <div className="hidden overflow-x-auto md:block">

                                        <table className="w-full min-w-[850px] text-left">

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
                                                                                <span className="shrink-0 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
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

                                    {/* =================================================
                                        MOBILE CARDS
                                    ================================================== */}

                                    <div className="space-y-3 p-3 md:hidden">

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
                                                    <div
                                                        key={
                                                            result.id
                                                        }
                                                        className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                                                    >

                                                        {/* ENDPOINT */}

                                                        <div className="min-w-0">

                                                            <div className="flex items-start justify-between gap-3">

                                                                <div className="min-w-0">

                                                                    <p className="truncate font-semibold text-slate-200">
                                                                        {endpoint?.name ||
                                                                            "Unknown endpoint"}
                                                                    </p>

                                                                    <div className="mt-2 flex min-w-0 items-center gap-2">

                                                                        {endpoint?.method && (
                                                                            <span className="shrink-0 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
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

                                                                {/* STATUS */}

                                                                {result.statusCode ? (
                                                                    <span
                                                                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${
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
                                                                    <span className="shrink-0 rounded-lg border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-xs font-bold text-red-400">
                                                                        ERROR
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </div>

                                                        {/* DETAILS */}

                                                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">

                                                            {/* RESPONSE TIME */}

                                                            <div>

                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                                                    Response Time
                                                                </p>

                                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">

                                                                    <span
                                                                        className={`text-sm font-semibold ${
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
                                                                        <span className="rounded-full border border-orange-400/20 bg-orange-400/5 px-1.5 py-0.5 text-[9px] font-semibold text-orange-400">
                                                                            Slow
                                                                        </span>
                                                                    )}

                                                                </div>

                                                            </div>

                                                            {/* RESULT */}

                                                            <div>

                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                                                    Result
                                                                </p>

                                                                <div className="mt-1">

                                                                    {result.success ? (
                                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-bold text-emerald-400">

                                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                                                                            PASS

                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-[10px] font-bold text-red-400">

                                                                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                                                                            FAIL

                                                                        </span>
                                                                    )}

                                                                </div>

                                                            </div>

                                                        </div>

                                                        {/* BUG DETECTION */}

                                                        <div className="mt-3 border-t border-white/5 pt-3">

                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                                                Bug Detection
                                                            </p>

                                                            <div className="mt-2">

                                                                {result.bugDetected ? (
                                                                    <div className="flex flex-wrap items-center gap-2">

                                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/5 px-2.5 py-1 text-[10px] font-bold text-orange-400">
                                                                            ⚠ BUG
                                                                            DETECTED
                                                                        </span>

                                                                        {result.bugType && (
                                                                            <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-500">
                                                                                {
                                                                                    result.bugType
                                                                                }
                                                                            </span>
                                                                        )}

                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                                                        ✓ No Bug
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </div>

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>
                                </>
                            )}

                        </GlassCard>

                        {/* =================================================
                            FOOTER
                        ================================================= */}

                        <footer className="px-2 py-6 text-center sm:py-8">

                            <p className="text-[11px] leading-5 text-slate-600 sm:text-xs">
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
            className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-[0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl ${className}`}
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
            className={`group rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 sm:p-5 ${color.glow}`}
        >

            <div className="flex items-center justify-between gap-3">

                <div className="min-w-0">

                    <p className="text-sm text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {value}
                    </p>

                </div>

                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color.box} ${color.text} sm:h-11 sm:w-11`}
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
            className={`rounded-2xl border ${style.border} ${style.bg} p-4 backdrop-blur-xl sm:p-5 ${style.glow}`}
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