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

                // 1. Get projects
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

                // 2. Get endpoints from all projects
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

                // 3. Get test results from all endpoints
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

    const failedTests = results.filter(
        (result) => !result.success,
    ).length;

    const recentResults = [...results]
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        )
        .slice(0, 5);

    return (
        <main className="min-h-screen bg-slate-100 p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        AutoAPI Sentinel
                    </h1>

                    <p className="mt-1 text-slate-500">
                        API Testing & Bug Discovery Dashboard
                    </p>
                </div>

                {loading && (
                    <div className="rounded-xl bg-white p-6">
                        Loading dashboard...
                    </div>
                )}

                {error && (
                    <div className="rounded-xl bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Statistics */}
                        <div className="grid gap-6 md:grid-cols-4">
                            <Card
                                title="Projects"
                                value={projects.length}
                            />

                            <Card
                                title="Endpoints"
                                value={endpoints.length}
                            />

                            <Card
                                title="Tests Run"
                                value={results.length}
                            />

                            <Card
                                title="Failed Tests"
                                value={failedTests}
                            />
                        </div>

                        {/* Projects */}
                        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold">
                                    Your Projects
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Projects created by your account
                                </p>
                            </div>

                            {projects.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                                    <p className="font-medium text-slate-700">
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
                                            className="rounded-lg border border-slate-200 p-5"
                                        >
                                            <h3 className="font-semibold text-slate-900">
                                                {project.name}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {project.description || "No description"}
                                            </p>

                                            <button
                                                onClick={() =>
                                                    (window.location.href = `/projects/${project.id}`)
                                                }
                                                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                                            >
                                                Open Project
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Recent Tests */}
                        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold">
                                    Recent Tests
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Latest API test executions
                                </p>
                            </div>

                            {recentResults.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                                    <p className="text-sm text-slate-500">
                                        No tests have been run yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-slate-200 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Endpoint
                                                </th>

                                                <th className="px-4 py-3">
                                                    Status
                                                </th>

                                                <th className="px-4 py-3">
                                                    Response Time
                                                </th>

                                                <th className="px-4 py-3">
                                                    Result
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {recentResults.map((result) => {
                                                const endpoint =
                                                    endpoints.find(
                                                        (item) =>
                                                            item.id ===
                                                            result.endpointId,
                                                    );

                                                return (
                                                    <tr
                                                        key={result.id}
                                                        className="border-b border-slate-100"
                                                    >
                                                        <td className="px-4 py-4">
                                                            {endpoint?.name ||
                                                                "Unknown endpoint"}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {result.statusCode ??
                                                                "Error"}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {result.responseTime} ms
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {result.success ? (
                                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                                                    PASS
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                                                    FAIL
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
                    </>
                )}
            </div>
        </main>
    );
}

function Card({
    title,
    value,
}: {
    title: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
                {title}
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    );
}