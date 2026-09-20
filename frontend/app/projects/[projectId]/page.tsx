"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "next/navigation";

type Endpoint = {
  id: string;
  name: string;
  method: string;
  url: string;

  headers?: Record<string, string>;
  body?: unknown;

  expectedStatus?: number | null;
  maxResponseTime?: number | null;

  createdAt: string;
};

type TestResult = {
  id: string;
  endpointId: string;

  statusCode: number | null;
  responseTime: number;

  success: boolean;

  responseBody?: unknown;
  error?: string | null;

  bugDetected: boolean;
  bugType?: string | null;
  bugMessage?: string | null;

  createdAt: string;
};

export default function ProjectPage() {
  const params = useParams();

  const projectId =
    params.projectId as string;

  const [endpoints, setEndpoints] =
    useState<Endpoint[]>([]);

  const [results, setResults] =
    useState<TestResult[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [runningId, setRunningId] =
    useState<string | null>(null);

  const [
    addingEndpoint,
    setAddingEndpoint,
  ] = useState(false);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [
    showHistory,
    setShowHistory,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    endpointName,
    setEndpointName,
  ] = useState("");

  const [
    endpointMethod,
    setEndpointMethod,
  ] = useState("GET");

  const [
    endpointUrl,
    setEndpointUrl,
  ] = useState("");

  const [
    endpointHeaders,
    setEndpointHeaders,
  ] = useState("");

  const [
    endpointBody,
    setEndpointBody,
  ] = useState("");

  const [
    expectedStatus,
    setExpectedStatus,
  ] = useState("200");

  const [
    maxResponseTime,
    setMaxResponseTime,
  ] = useState("1000");

  // ============================================================
  // LOAD ENDPOINTS
  // ============================================================

  async function loadEndpoints() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response =
        await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load endpoints",
        );
      }

      setEndpoints(data);
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

  // ============================================================
  // LOAD RESULTS
  // ============================================================

  async function loadResults(
    currentEndpoints: Endpoint[],
  ) {
    try {
      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        return;
      }

      const allResults: TestResult[] =
        [];

      for (
        const endpoint of currentEndpoints
      ) {
        const response =
          await fetch(
            `http://localhost:5000/projects/${projectId}/endpoints/${endpoint.id}/results`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (!response.ok) {
          continue;
        }

        const data =
          await response.json();

        allResults.push(
          ...(data as TestResult[]),
        );
      }

      // Latest result first
      allResults.sort(
        (a, b) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      );

      setResults(
        allResults.slice(0, 50),
      );
    } catch {
      // Keep page usable.
    }
  }

  // ============================================================
  // ADD ENDPOINT
  // ============================================================

  async function addEndpoint(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!endpointName.trim()) {
      setError(
        "Endpoint name is required.",
      );
      return;
    }

    if (!endpointUrl.trim()) {
      setError(
        "API URL is required.",
      );
      return;
    }

    const parsedExpectedStatus =
      expectedStatus.trim()
        ? Number(expectedStatus)
        : undefined;

    if (
      parsedExpectedStatus !== undefined &&
      (!Number.isInteger(
        parsedExpectedStatus,
      ) ||
        parsedExpectedStatus < 100 ||
        parsedExpectedStatus > 599)
    ) {
      setError(
        "Expected Status Code must be between 100 and 599.",
      );
      return;
    }

    const parsedMaxResponseTime =
      maxResponseTime.trim()
        ? Number(maxResponseTime)
        : undefined;

    if (
      parsedMaxResponseTime !== undefined &&
      (!Number.isInteger(
        parsedMaxResponseTime,
      ) ||
        parsedMaxResponseTime <= 0)
    ) {
      setError(
        "Max Response Time must be greater than 0.",
      );
      return;
    }

    let parsedHeaders:
      | Record<string, string>
      | undefined;

    let parsedBody: unknown;

    try {
      if (endpointHeaders.trim()) {
        const headers =
          JSON.parse(endpointHeaders);

        if (
          typeof headers !== "object" ||
          headers === null ||
          Array.isArray(headers)
        ) {
          throw new Error();
        }

        parsedHeaders =
          headers as Record<
            string,
            string
          >;
      }

      if (endpointBody.trim()) {
        parsedBody =
          JSON.parse(endpointBody);
      }
    } catch {
      setError(
        "Headers and Request Body must contain valid JSON.",
      );
      return;
    }

    try {
      setAddingEndpoint(true);

      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response =
        await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              name:
                endpointName.trim(),

              method:
                endpointMethod,

              url:
                endpointUrl.trim(),

              headers:
                parsedHeaders,

              body:
                parsedBody,

              expectedStatus:
                parsedExpectedStatus,

              maxResponseTime:
                parsedMaxResponseTime,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create endpoint",
        );
      }

      // New endpoint goes to TOP
      setEndpoints((current) => [
        data,
        ...current,
      ]);

      // Reset form
      setEndpointName("");
      setEndpointMethod("GET");
      setEndpointUrl("");
      setEndpointHeaders("");
      setEndpointBody("");
      setExpectedStatus("200");
      setMaxResponseTime("1000");

      setShowAddForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create endpoint",
      );
    } finally {
      setAddingEndpoint(false);
    }
  }

  // ============================================================
  // RUN TEST
  // ============================================================

  async function runTest(
    endpointId: string,
  ) {
    try {
      setRunningId(endpointId);
      setError("");

      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response =
        await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}/run`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Test failed",
        );
      }

      const newResult: TestResult =
        {
          id: data.id,

          endpointId:
            data.endpointId,

          statusCode:
            data.statusCode ?? null,

          responseTime:
            data.responseTime,

          success:
            data.success,

          responseBody:
            data.responseBody,

          error:
            data.error ?? null,

          bugDetected:
            data.bugDetected ??
            false,

          bugType:
            data.bugType ?? null,

          bugMessage:
            data.bugMessage ??
            null,

          createdAt:
            data.createdAt,
        };

      // Latest test goes to TOP
      setResults((current) => {
        const updated = [
          newResult,
          ...current.filter(
            (item) =>
              item.id !==
              newResult.id,
          ),
        ];

        return updated
          .sort(
            (a, b) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          )
          .slice(0, 50);
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Test failed",
      );
    } finally {
      setRunningId(null);
    }
  }

  // ============================================================
  // DELETE ENDPOINT
  // ============================================================

  async function deleteEndpoint(
    endpointId: string,
    endpointName: string,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${endpointName}"?\n\nAll test history for this endpoint will also be deleted.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response =
        await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete endpoint",
        );
      }

      // Remove endpoint
      setEndpoints((current) =>
        current.filter(
          (endpoint) =>
            endpoint.id !==
            endpointId,
        ),
      );

      // Remove its history from UI
      setResults((current) =>
        current.filter(
          (result) =>
            result.endpointId !==
            endpointId,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete endpoint",
      );
    }
  }

  // ============================================================
  // DELETE TEST RESULT
  // ============================================================

  async function deleteTestResult(
    resultId: string,
    endpointId: string,
  ) {
    const confirmed =
      window.confirm(
        "Delete this test result?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const token =
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        window.location.href = "/";
        return;
      }

      // IMPORTANT:
      // Endpoint ID is required here.
      const response =
        await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}/results/${resultId}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete test result",
        );
      }

      // Remove result from UI immediately
      setResults((current) =>
        current.filter(
          (result) =>
            result.id !==
            resultId,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete test result",
      );
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadEndpoints();
  }, [projectId]);

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  useEffect(() => {
    if (endpoints.length > 0) {
      loadResults(endpoints);
    } else {
      setResults([]);
    }
  }, [endpoints, projectId]);

  // ============================================================
  // SORT ENDPOINTS BY LATEST ACTIVITY
  // ============================================================

  const sortedEndpoints =
    useMemo(() => {
      return [...endpoints].sort(
        (a, b) => {
          const latestA =
            results.find(
              (result) =>
                result.endpointId ===
                a.id,
            );

          const latestB =
            results.find(
              (result) =>
                result.endpointId ===
                b.id,
            );

          const activityA =
            latestA
              ? new Date(
                  latestA.createdAt,
                ).getTime()
              : new Date(
                  a.createdAt,
                ).getTime();

          const activityB =
            latestB
              ? new Date(
                  latestB.createdAt,
                ).getTime()
              : new Date(
                  b.createdAt,
                ).getTime();

          return (
            activityB -
            activityA
          );
        },
      );
    }, [endpoints, results]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-800/70 p-8">
      <div className="relative z-10 mx-auto max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-8">
          <button
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="mb-4 text-sm font-medium text-slate-500 hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Project Endpoints
              </h1>

              <p className="mt-1 text-slate-500">
                Manage and test your API
                endpoints.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={() =>
                  setShowHistory(true)
                }
                className="rounded-lg border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900/70/5"
              >
                Test History
              </button>

              <button
                onClick={() =>
                  setShowAddForm(
                    (current) =>
                      !current,
                  )
                }
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500"
              >
                {showAddForm
                  ? "Close Form"
                  : "+ Add Endpoint"}
              </button>

            </div>
          </div>
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ======================================================
            ADD ENDPOINT FORM
        ====================================================== */}

        {showAddForm && (
          <section className="mb-8 rounded-xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl">

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                Add New Endpoint
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add an API endpoint with
                automatic validation rules.
              </p>
            </div>

            <form
              onSubmit={addEndpoint}
              className="space-y-5"
            >

              {/* NAME + METHOD */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label
                    htmlFor="endpoint-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Endpoint Name
                  </label>

                  <input
                    id="endpoint-name"
                    type="text"
                    value={endpointName}
                    onChange={(event) =>
                      setEndpointName(
                        event.target.value,
                      )
                    }
                    placeholder="Get Users"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endpoint-method"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    HTTP Method
                  </label>

                  <select
                    id="endpoint-method"
                    value={endpointMethod}
                    onChange={(event) =>
                      setEndpointMethod(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="GET">
                      GET
                    </option>

                    <option value="POST">
                      POST
                    </option>

                    <option value="PUT">
                      PUT
                    </option>

                    <option value="PATCH">
                      PATCH
                    </option>

                    <option value="DELETE">
                      DELETE
                    </option>
                  </select>
                </div>

              </div>

              {/* URL */}

              <div>
                <label
                  htmlFor="endpoint-url"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  API URL
                </label>

                <input
                  id="endpoint-url"
                  type="url"
                  value={endpointUrl}
                  onChange={(event) =>
                    setEndpointUrl(
                      event.target.value,
                    )
                  }
                  placeholder="https://jsonplaceholder.typicode.com/users"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* VALIDATION */}

              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">

                <h3 className="mb-4 font-semibold text-white">
                  Automated Validation
                </h3>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>
                    <label
                      htmlFor="expected-status"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Expected Status Code
                    </label>

                    <input
                      id="expected-status"
                      type="number"
                      min="100"
                      max="599"
                      value={expectedStatus}
                      onChange={(event) =>
                        setExpectedStatus(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="max-response-time"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Max Response Time (ms)
                    </label>

                    <input
                      id="max-response-time"
                      type="number"
                      min="1"
                      value={maxResponseTime}
                      onChange={(event) =>
                        setMaxResponseTime(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* HEADERS */}

              <div>
                <label
                  htmlFor="endpoint-headers"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Headers (JSON)
                </label>

                <textarea
                  id="endpoint-headers"
                  value={endpointHeaders}
                  onChange={(event) =>
                    setEndpointHeaders(
                      event.target.value,
                    )
                  }
                  rows={6}
                  placeholder={`{
  "Content-Type": "application/json"
}`}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* BODY */}

              <div>
                <label
                  htmlFor="endpoint-body"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Request Body (JSON)
                </label>

                <textarea
                  id="endpoint-body"
                  value={endpointBody}
                  onChange={(event) =>
                    setEndpointBody(
                      event.target.value,
                    )
                  }
                  rows={8}
                  placeholder={`{
  "name": "Gaurav"
}`}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* BUTTONS */}

              <div className="flex gap-3">

                <button
                  type="submit"
                  disabled={addingEndpoint}
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
                >
                  {addingEndpoint
                    ? "Adding..."
                    : "Add Endpoint"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                  }}
                  className="rounded-lg border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900/70/5"
                >
                  Cancel
                </button>

              </div>

            </form>
          </section>
        )}

        {/* ======================================================
            ENDPOINTS
        ====================================================== */}

        <section className="rounded-xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl">

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">
              Endpoints
            </h2>

            <p className="text-sm text-slate-500">
              Latest activity appears
              first.
            </p>
          </div>

          {loading ? (
            <p className="text-slate-500">
              Loading endpoints...
            </p>
          ) : sortedEndpoints.length ===
            0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">

              <p className="font-medium text-slate-300">
                No endpoints found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first API endpoint
                above.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {sortedEndpoints.map(
                (endpoint) => {
                  const latestResult =
                    results
                      .filter(
                        (result) =>
                          result.endpointId ===
                          endpoint.id,
                      )
                      .sort(
                        (a, b) =>
                          new Date(
                            b.createdAt,
                          ).getTime() -
                          new Date(
                            a.createdAt,
                          ).getTime(),
                      )[0];

                  return (
                    <div
                      key={endpoint.id}
                      className="rounded-xl border border-white/10 p-5"
                    >

                      {/* ENDPOINT HEADER */}

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div className="min-w-0">

                          <h3 className="font-semibold text-white">
                            {endpoint.name}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-3">

                            <span className="rounded-md bg-slate-800/70 px-2 py-1 text-xs font-bold text-slate-300">
                              {endpoint.method}
                            </span>

                            <span className="break-all text-sm text-slate-500">
                              {endpoint.url}
                            </span>

                          </div>

                        </div>

                        <div className="flex shrink-0 gap-2">

                          <button
                            onClick={() =>
                              runTest(
                                endpoint.id,
                              )
                            }
                            disabled={
                              runningId ===
                              endpoint.id
                            }
                            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
                          >
                            {runningId ===
                            endpoint.id
                              ? "Running..."
                              : "Run Test"}
                          </button>

                          <button
                            onClick={() =>
                              deleteEndpoint(
                                endpoint.id,
                                endpoint.name,
                              )
                            }
                            className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/20"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                      {/* VALIDATION RULES */}

                      <div className="mt-4 flex flex-wrap gap-2">

                        {endpoint.expectedStatus !==
                          null &&
                          endpoint.expectedStatus !==
                            undefined && (
                            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-500">
                              Expected:{" "}
                              {
                                endpoint.expectedStatus
                              }
                            </span>
                          )}

                        {endpoint.maxResponseTime !==
                          null &&
                          endpoint.maxResponseTime !==
                            undefined && (
                            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-500">
                              Max:{" "}
                              {
                                endpoint.maxResponseTime
                              }
                              ms
                            </span>
                          )}

                      </div>

                      {/* LATEST RESULT */}

                      {latestResult && (
                        <div className="mt-5 border-t border-white/5 pt-5">

                          <div className="grid gap-4 md:grid-cols-4">

                            <ResultItem
                              label="Status Code"
                              value={
                                latestResult.statusCode ??
                                "Error"
                              }
                            />

                            <ResultItem
                              label="Response Time"
                              value={`${latestResult.responseTime} ms`}
                            />

                            <ResultItem
                              label="Result"
                              value={
                                latestResult.success
                                  ? "PASS"
                                  : "FAIL"
                              }
                              success={
                                latestResult.success
                              }
                            />

                            <ResultItem
                              label="Bug Detected"
                              value={
                                latestResult.bugDetected
                                  ? "YES"
                                  : "NO"
                              }
                              success={
                                !latestResult.bugDetected
                              }
                            />

                          </div>

                          {latestResult.bugDetected && (
                            <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-4">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-400">
                                  BUG DETECTED
                                </span>

                                {latestResult.bugType && (
                                  <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-red-400">
                                    {
                                      latestResult.bugType
                                    }
                                  </span>
                                )}

                              </div>

                              {latestResult.bugMessage && (
                                <p className="mt-2 text-sm text-red-400">
                                  {
                                    latestResult.bugMessage
                                  }
                                </p>
                              )}

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                },
              )}

            </div>
          )}
        </section>
      </div>

      {/* ========================================================
          TEST HISTORY MODAL
      ======================================================== */}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-white/10 p-6">

              <div>
                <h2 className="text-2xl font-bold text-white">
                  Test History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Newest tests appear first.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowHistory(false)
                }
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900/70/5"
              >
                Close
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto p-6">

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">

                  <p className="font-medium text-slate-300">
                    No test results yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Run an endpoint test
                    to create history.
                  </p>

                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-white/10 text-slate-500">

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

                        <th className="px-4 py-3">
                          Bug
                        </th>

                        <th className="px-4 py-3">
                          Time
                        </th>

                        <th className="px-4 py-3">
                          Action
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {results.map(
                        (result) => {
                          const endpoint =
                            endpoints.find(
                              (item) =>
                                item.id ===
                                result.endpointId,
                            );

                          return (
                            <tr
                              key={result.id}
                              className="border-b border-white/5"
                            >

                              <td className="px-4 py-4 font-medium text-white">
                                {endpoint?.name ||
                                  "Unknown"}
                              </td>

                              <td className="px-4 py-4 text-slate-300">
                                {
                                  result.statusCode ??
                                  "Error"
                                }
                              </td>

                              <td className="px-4 py-4 text-slate-300">
                                {
                                  result.responseTime
                                }{" "}
                                ms
                              </td>

                              <td className="px-4 py-4">

                                {result.success ? (
                                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                    PASS
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-400">
                                    FAIL
                                  </span>
                                )}

                              </td>

                              <td className="px-4 py-4">

                                {result.bugDetected ? (
                                  <div className="flex flex-col gap-1">

                                    <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-400">
                                      YES
                                    </span>

                                    {result.bugType && (
                                      <span className="text-xs text-red-400">
                                        {
                                          result.bugType
                                        }
                                      </span>
                                    )}

                                  </div>
                                ) : (
                                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                    NO
                                  </span>
                                )}

                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                                {new Date(
                                  result.createdAt,
                                ).toLocaleString()}
                              </td>

                              <td className="px-4 py-4">

                                <button
                                  onClick={() =>
                                    deleteTestResult(
                                      result.id,
                                      result.endpointId,
                                    )
                                  }
                                  className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-400/20"
                                >
                                  Delete
                                </button>

                              </td>

                            </tr>
                          );
                        },
                      )}

                    </tbody>
                  </table>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// RESULT ITEM
// ============================================================

function ResultItem({
  label,
  value,
  success,
}: {
  label: string;
  value: string | number;
  success?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 font-semibold ${
          success === true
            ? "text-emerald-400"
            : success === false
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}