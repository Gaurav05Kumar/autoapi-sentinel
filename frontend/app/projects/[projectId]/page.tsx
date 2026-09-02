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
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-8">
          <button
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
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
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
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
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ======================================================
            ADD ENDPOINT FORM
        ====================================================== */}

        {showAddForm && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
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
                    className="mb-2 block text-sm font-medium text-slate-700"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endpoint-method"
                    className="mb-2 block text-sm font-medium text-slate-700"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* VALIDATION */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                <h3 className="mb-4 font-semibold text-slate-900">
                  Automated Validation
                </h3>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>
                    <label
                      htmlFor="expected-status"
                      className="mb-2 block text-sm font-medium text-slate-700"
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="max-response-time"
                      className="mb-2 block text-sm font-medium text-slate-700"
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* HEADERS */}

              <div>
                <label
                  htmlFor="endpoint-headers"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* BODY */}

              <div>
                <label
                  htmlFor="endpoint-body"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* BUTTONS */}

              <div className="flex gap-3">

                <button
                  type="submit"
                  disabled={addingEndpoint}
                  className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
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

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
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
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">

              <p className="font-medium text-slate-700">
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
                      className="rounded-xl border border-slate-200 p-5"
                    >

                      {/* ENDPOINT HEADER */}

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div className="min-w-0">

                          <h3 className="font-semibold text-slate-900">
                            {endpoint.name}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-3">

                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                              {endpoint.method}
                            </span>

                            <span className="break-all text-sm text-slate-600">
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
                            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
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
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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
                        <div className="mt-5 border-t border-slate-100 pt-5">

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
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                  BUG DETECTED
                                </span>

                                {latestResult.bugType && (
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-red-700">
                                    {
                                      latestResult.bugType
                                    }
                                  </span>
                                )}

                              </div>

                              {latestResult.bugMessage && (
                                <p className="mt-2 text-sm text-red-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
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
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto p-6">

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">

                  <p className="font-medium text-slate-700">
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
                              className="border-b border-slate-100"
                            >

                              <td className="px-4 py-4 font-medium text-slate-900">
                                {endpoint?.name ||
                                  "Unknown"}
                              </td>

                              <td className="px-4 py-4 text-slate-700">
                                {
                                  result.statusCode ??
                                  "Error"
                                }
                              </td>

                              <td className="px-4 py-4 text-slate-700">
                                {
                                  result.responseTime
                                }{" "}
                                ms
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

                              <td className="px-4 py-4">

                                {result.bugDetected ? (
                                  <div className="flex flex-col gap-1">

                                    <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                      YES
                                    </span>

                                    {result.bugType && (
                                      <span className="text-xs text-red-600">
                                        {
                                          result.bugType
                                        }
                                      </span>
                                    )}

                                  </div>
                                ) : (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
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
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
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
            ? "text-green-600"
            : success === false
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}