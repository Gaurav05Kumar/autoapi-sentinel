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

  const projectId = params.projectId as string;

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);

  const [loading, setLoading] = useState(true);

  const [runningId, setRunningId] =
    useState<string | null>(null);

  // ============================================================
  // RUN ALL TESTS STATE
  // ============================================================

  const [runningAll, setRunningAll] = useState(false);

  const [runAllProgress, setRunAllProgress] =
    useState({
      current: 0,
      total: 0,
    });

  const [runAllSummary, setRunAllSummary] =
    useState<{
      total: number;
      passed: number;
      failed: number;
      bugs: number;
    } | null>(null);

  const [addingEndpoint, setAddingEndpoint] =
    useState(false);

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [showHistory, setShowHistory] =
    useState(false);

  const [selectedResult, setSelectedResult] =
    useState<TestResult | null>(null);

  const [error, setError] = useState("");

  // ============================================================
  // ADD ENDPOINT FORM STATE
  // ============================================================

  const [endpointName, setEndpointName] =
    useState("");

  const [endpointMethod, setEndpointMethod] =
    useState("GET");

  const [endpointUrl, setEndpointUrl] =
    useState("");

  const [endpointHeaders, setEndpointHeaders] =
    useState("");

  const [endpointBody, setEndpointBody] =
    useState("");

  const [expectedStatus, setExpectedStatus] =
    useState("200");

  const [maxResponseTime, setMaxResponseTime] =
    useState("1000");

  // ============================================================
  // LOAD ENDPOINTS
  // ============================================================

  async function loadEndpoints() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("accessToken");

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        `http://localhost:5000/projects/${projectId}/endpoints`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

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
  // LOAD TEST RESULTS
  // ============================================================

  async function loadResults(
    currentEndpoints: Endpoint[],
  ) {
    try {
      const token =
        localStorage.getItem("accessToken");

      if (!token) {
        return;
      }

      const allResults: TestResult[] = [];

      for (const endpoint of currentEndpoints) {
        const response = await fetch(
          `http://localhost:5000/projects/${projectId}/endpoints/${endpoint.id}/results`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        allResults.push(
          ...(data as TestResult[]),
        );
      }

      // Latest result first
      allResults.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

      // Keep latest 50 results
      setResults(
        allResults.slice(0, 50),
      );
    } catch {
      // Keep page usable if history loading fails.
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

    // ----------------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------------

    if (!endpointName.trim()) {
      setError(
        "Endpoint name is required.",
      );
      return;
    }

    if (!endpointUrl.trim()) {
      setError("API URL is required.");
      return;
    }

    // ----------------------------------------------------------
    // EXPECTED STATUS VALIDATION
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // RESPONSE TIME VALIDATION
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // PARSE HEADERS + BODY
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // SEND REQUEST
    // ----------------------------------------------------------

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

      const response = await fetch(
        `http://localhost:5000/projects/${projectId}/endpoints`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: endpointName.trim(),

            method: endpointMethod,

            url: endpointUrl.trim(),

            headers: parsedHeaders,

            body: parsedBody,

            expectedStatus:
              parsedExpectedStatus,

            maxResponseTime:
              parsedMaxResponseTime,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create endpoint",
        );
      }

      // New endpoint appears at TOP
      setEndpoints((current) => [
        data,
        ...current,
      ]);

      // --------------------------------------------------------
      // RESET FORM
      // --------------------------------------------------------

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
  // EXECUTE SINGLE TEST
  // ============================================================

  async function executeTest(
    endpointId: string,
  ): Promise<TestResult | null> {
    const token =
      localStorage.getItem("accessToken");

    if (!token) {
      window.location.href = "/";
      return null;
    }

    const response = await fetch(
      `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}/run`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Test failed",
      );
    }

    return {
      id: data.id,

      endpointId: data.endpointId,

      statusCode:
        data.statusCode ?? null,

      responseTime:
        data.responseTime,

      success: data.success,

      responseBody:
        data.responseBody,

      error:
        data.error ?? null,

      bugDetected:
        data.bugDetected ?? false,

      bugType:
        data.bugType ?? null,

      bugMessage:
        data.bugMessage ?? null,

      createdAt:
        data.createdAt,
    };
  }

  // ============================================================
  // RUN SINGLE TEST
  // ============================================================

  async function runTest(
    endpointId: string,
  ) {
    try {
      setRunningId(endpointId);
      setError("");
      setRunAllSummary(null);

      const newResult =
        await executeTest(endpointId);

      if (!newResult) {
        return;
      }

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
  // RUN ALL TESTS
  // ============================================================

  async function runAllTests() {
    if (
      endpoints.length === 0 ||
      runningAll ||
      loading
    ) {
      return;
    }

    try {
      setRunningAll(true);
      setRunningId(null);
      setError("");
      setRunAllSummary(null);

      const total =
        endpoints.length;

      setRunAllProgress({
        current: 0,
        total,
      });

      const newResults: TestResult[] =
        [];

      // --------------------------------------------------------
      // RUN EVERY ENDPOINT SEQUENTIALLY
      // --------------------------------------------------------

      for (
        let i = 0;
        i < endpoints.length;
        i++
      ) {
        const endpoint =
          endpoints[i];

        setRunAllProgress({
          current: i + 1,
          total,
        });

        try {
          const result =
            await executeTest(
              endpoint.id,
            );

          if (result) {
            newResults.push(result);

            // Immediately update UI
            setResults(
              (current) => {
                const updated = [
                  result,
                  ...current.filter(
                    (item) =>
                      item.id !==
                      result.id,
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
              },
            );
          }
        } catch (err) {
          // One failed request does NOT stop remaining tests.
          console.error(
            `Failed to run endpoint "${endpoint.name}":`,
            err,
          );
        }
      }

      // --------------------------------------------------------
      // CALCULATE SUMMARY
      // --------------------------------------------------------

      const passed =
        newResults.filter(
          (result) =>
            result.success,
        ).length;

      const failed =
        newResults.filter(
          (result) =>
            !result.success,
        ).length;

      const bugs =
        newResults.filter(
          (result) =>
            result.bugDetected,
        ).length;

      setRunAllSummary({
        total: newResults.length,
        passed,
        failed,
        bugs,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to run all tests",
      );
    } finally {
      setRunningAll(false);
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

      const response = await fetch(
        `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete endpoint",
        );
      }

      // Remove endpoint from UI
      setEndpoints((current) =>
        current.filter(
          (endpoint) =>
            endpoint.id !==
            endpointId,
        ),
      );

      // Remove history
      setResults((current) =>
        current.filter(
          (result) =>
            result.endpointId !==
            endpointId,
        ),
      );

      // Close selected result
      setSelectedResult(
        (current) => {
          if (
            current?.endpointId ===
            endpointId
          ) {
            return null;
          }

          return current;
        },
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

      const response = await fetch(
        `http://localhost:5000/projects/${projectId}/endpoints/${endpointId}/results/${resultId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete test result",
        );
      }

      // Remove result from UI
      setResults((current) =>
        current.filter(
          (result) =>
            result.id !==
            resultId,
        ),
      );

      // Close details modal
      setSelectedResult(
        (current) => {
          if (
            current?.id === resultId
          ) {
            return null;
          }

          return current;
        },
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

          return activityB - activityA;
        },
      );
    }, [endpoints, results]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-8 lg:py-8">

      <div className="relative z-10 mx-auto w-full max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 sm:mb-8">

          <button
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-cyan-400"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div className="min-w-0">

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Project Endpoints
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
                Manage and test your API
                endpoints.
              </p>

            </div>

            {/* ACTION BUTTONS */}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">

              {/* RUN ALL */}

              <button
                onClick={runAllTests}
                disabled={
                  runningAll ||
                  loading ||
                  endpoints.length === 0
                }
                className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 px-4 py-3 text-sm font-medium text-white shadow-[0_0_25px_rgba(139,92,246,0.15)] transition hover:from-violet-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
              >
                {runningAll
                  ? `Running ${runAllProgress.current}/${runAllProgress.total}`
                  : "▶ Run All Tests"}
              </button>

              {/* HISTORY */}

              <button
                onClick={() =>
                  setShowHistory(true)
                }
                className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:px-5"
              >
                Test History
              </button>

              {/* ADD ENDPOINT */}

              <button
                onClick={() =>
                  setShowAddForm(
                    (current) =>
                      !current,
                  )
                }
                disabled={runningAll}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-medium text-white shadow-[0_0_25px_rgba(34,211,238,0.12)] transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
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
          <div className="mb-6 break-words rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-400">
            {error}
          </div>
        )}

        {/* ======================================================
            RUN ALL TESTS PROGRESS
        ====================================================== */}

        {runningAll && (
          <div className="mb-6 rounded-2xl border border-violet-400/20 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl sm:p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <h3 className="font-semibold text-white">
                  Running API Tests
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Testing endpoints one by
                  one...
                </p>

              </div>

              <span className="w-fit rounded-full bg-violet-400/10 px-3 py-1 text-sm font-medium text-violet-400">
                {runAllProgress.current} /{" "}
                {runAllProgress.total}
              </span>

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">

              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
                style={{
                  width: `${
                    runAllProgress.total >
                    0
                      ? (runAllProgress.current /
                          runAllProgress.total) *
                        100
                      : 0
                  }%`,
                }}
              />

            </div>

          </div>
        )}

        {/* ======================================================
            RUN ALL TESTS SUMMARY
        ====================================================== */}

        {runAllSummary &&
          !runningAll && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl sm:p-5">

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">

                  <h3 className="font-semibold text-white">
                    Last Run Summary
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Results from the latest Run
                    All Tests operation.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setRunAllSummary(
                      null,
                    )
                  }
                  className="w-fit text-sm text-slate-500 transition hover:text-white"
                >
                  Dismiss
                </button>

              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <SummaryBox
                  label="Total Tests"
                  value={
                    runAllSummary.total
                  }
                  color="white"
                />

                <SummaryBox
                  label="Passed"
                  value={
                    runAllSummary.passed
                  }
                  color="green"
                />

                <SummaryBox
                  label="Failed"
                  value={
                    runAllSummary.failed
                  }
                  color="red"
                />

                <SummaryBox
                  label="Bugs Detected"
                  value={
                    runAllSummary.bugs
                  }
                  color="orange"
                />

              </div>

            </div>
          )}

        {/* ======================================================
            ADD ENDPOINT FORM
        ====================================================== */}

        {showAddForm && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl sm:mb-8 sm:p-6">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Add New Endpoint
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
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

                <div className="min-w-0">

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
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
                  />

                </div>

                <div className="min-w-0">

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
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
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
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
                />

              </div>

              {/* AUTOMATED VALIDATION */}

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">

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
                      value={
                        expectedStatus
                      }
                      onChange={(event) =>
                        setExpectedStatus(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                    />

                  </div>

                  <div>

                    <label
                      htmlFor="max-response-time"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Max Response Time
                      (ms)
                    </label>

                    <input
                      id="max-response-time"
                      type="number"
                      min="1"
                      value={
                        maxResponseTime
                      }
                      onChange={(event) =>
                        setMaxResponseTime(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
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
                  value={
                    endpointHeaders
                  }
                  onChange={(event) =>
                    setEndpointHeaders(
                      event.target.value,
                    )
                  }
                  rows={6}
                  placeholder={`{
  "Content-Type": "application/json"
}`}
                  className="w-full max-w-full resize-y rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 font-mono text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 sm:text-sm"
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
                  className="w-full max-w-full resize-y rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 font-mono text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 sm:text-sm"
                />

              </div>

              {/* BUTTONS */}

              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">

                <button
                  type="submit"
                  disabled={
                    addingEndpoint ||
                    runningAll
                  }
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-[0_0_25px_rgba(34,211,238,0.12)] transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="rounded-xl border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
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

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl backdrop-blur-xl sm:p-6">

          <div className="mb-5">

            <h2 className="text-lg font-semibold text-white sm:text-xl">
              Endpoints
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest activity appears
              first.
            </p>

          </div>

          {loading ? (
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

              <p className="mt-4 text-sm text-slate-500">
                Loading endpoints...
              </p>
            </div>
          ) : sortedEndpoints.length ===
            0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center sm:p-10">

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
                      className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30 p-4 transition hover:border-cyan-400/20 sm:p-5"
                    >

                      {/* ENDPOINT HEADER */}

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="min-w-0">

                          <h3 className="break-words font-semibold text-white">
                            {endpoint.name}
                          </h3>

                          <div className="mt-2 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">

                            <span className="shrink-0 rounded-md bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-400">
                              {endpoint.method}
                            </span>

                            <span className="max-w-full break-all text-xs leading-5 text-slate-500 sm:text-sm">
                              {endpoint.url}
                            </span>

                          </div>

                        </div>

                        {/* ACTION BUTTONS */}

                        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">

                          <button
                            onClick={() =>
                              runTest(
                                endpoint.id,
                              )
                            }
                            disabled={
                              runningAll ||
                              runningId ===
                                endpoint.id
                            }
                            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.1)] transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
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
                            disabled={
                              runningAll
                            }
                            className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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
                            <span className="rounded-full border border-violet-400/10 bg-violet-400/10 px-3 py-1 text-[11px] font-medium text-violet-400 sm:text-xs">
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
                            <span className="rounded-full border border-orange-400/10 bg-orange-400/10 px-3 py-1 text-[11px] font-medium text-orange-400 sm:text-xs">
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

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">

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

                          {/* BUG */}

                          {latestResult.bugDetected && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-red-400/20 bg-red-400/10 p-4">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="rounded-full bg-red-400/20 px-3 py-1 text-[10px] font-bold text-red-400 sm:text-xs">
                                  BUG DETECTED
                                </span>

                                {latestResult.bugType && (
                                  <span className="max-w-full break-all rounded-full bg-slate-900/70 px-3 py-1 text-[10px] font-medium text-orange-400 sm:text-xs">
                                    {
                                      latestResult.bugType
                                    }
                                  </span>
                                )}

                              </div>

                              {latestResult.bugMessage && (
                                <p className="mt-2 break-words text-xs leading-5 text-red-300 sm:text-sm sm:leading-6">
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
          onClick={() =>
            setShowHistory(false)
          }
        >

          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_0_60px_rgba(34,211,238,0.08)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">

              <div className="min-w-0">

                <h2 className="text-xl font-bold text-white sm:text-2xl">
                  Test History
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Newest tests appear first.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowHistory(false)
                }
                className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:w-auto"
              >
                Close
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto p-3 sm:p-6">

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center sm:p-10">

                  <p className="font-medium text-slate-300">
                    No test results yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Run an endpoint test
                    to create history.
                  </p>

                </div>
              ) : (
                <>
                  {/* =================================================
                      DESKTOP HISTORY TABLE
                  ================================================== */}

                  <div className="hidden overflow-x-auto md:block">

                    <table className="w-full min-w-[900px] text-left text-sm">

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
                                key={
                                  result.id
                                }
                                className="border-b border-white/5 transition hover:bg-white/[0.02]"
                              >

                                <td className="max-w-[220px] px-4 py-4 font-medium text-white">

                                  <p className="truncate">
                                    {endpoint?.name ||
                                      "Unknown"}
                                  </p>

                                  {endpoint?.url && (
                                    <p className="mt-1 truncate text-xs text-slate-600">
                                      {
                                        endpoint.url
                                      }
                                    </p>
                                  )}

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
                                    <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-medium text-red-400">
                                      FAIL
                                    </span>
                                  )}

                                </td>

                                <td className="px-4 py-4">

                                  {result.bugDetected ? (
                                    <div className="flex flex-col gap-1">

                                      <span className="w-fit rounded-full bg-red-400/10 px-3 py-1 text-xs font-medium text-red-400">
                                        YES
                                      </span>

                                      {result.bugType && (
                                        <span className="text-xs text-orange-400">
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

                                  <div className="flex flex-wrap gap-2">

                                    <button
                                      onClick={() =>
                                        setSelectedResult(
                                          result,
                                        )
                                      }
                                      className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition hover:bg-cyan-400/20"
                                    >
                                      View
                                    </button>

                                    <button
                                      onClick={() =>
                                        deleteTestResult(
                                          result.id,
                                          result.endpointId,
                                        )
                                      }
                                      className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-400/20"
                                    >
                                      Delete
                                    </button>

                                  </div>

                                </td>

                              </tr>
                            );
                          },
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* =================================================
                      MOBILE HISTORY CARDS
                  ================================================== */}

                  <div className="space-y-3 md:hidden">

                    {results.map(
                      (result) => {
                        const endpoint =
                          endpoints.find(
                            (item) =>
                              item.id ===
                              result.endpointId,
                          );

                        return (
                          <div
                            key={
                              result.id
                            }
                            className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                          >

                            {/* TOP */}

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <p className="truncate font-semibold text-white">
                                  {endpoint?.name ||
                                    "Unknown"}
                                </p>

                                {endpoint?.url && (
                                  <p className="mt-1 break-all text-xs leading-5 text-slate-600">
                                    {
                                      endpoint.url
                                    }
                                  </p>
                                )}

                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                  result.success
                                    ? "bg-emerald-400/10 text-emerald-400"
                                    : "bg-red-400/10 text-red-400"
                                }`}
                              >
                                {result.success
                                  ? "PASS"
                                  : "FAIL"}
                              </span>

                            </div>

                            {/* DETAILS */}

                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">

                              <MobileHistoryItem
                                label="Status"
                                value={
                                  result.statusCode ??
                                  "Error"
                                }
                              />

                              <MobileHistoryItem
                                label="Response"
                                value={`${result.responseTime} ms`}
                              />

                              <div>

                                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                  Bug
                                </p>

                                <div className="mt-1">

                                  {result.bugDetected ? (
                                    <div className="flex flex-wrap gap-1.5">

                                      <span className="rounded-full bg-red-400/10 px-2 py-1 text-[10px] font-bold text-red-400">
                                        YES
                                      </span>

                                      {result.bugType && (
                                        <span className="break-all text-[10px] text-orange-400">
                                          {
                                            result.bugType
                                          }
                                        </span>
                                      )}

                                    </div>
                                  ) : (
                                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                                      NO
                                    </span>
                                  )}

                                </div>

                              </div>

                              <MobileHistoryItem
                                label="Time"
                                value={new Date(
                                  result.createdAt,
                                ).toLocaleString()}
                              />

                            </div>

                            {/* ACTIONS */}

                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-4">

                              <button
                                onClick={() =>
                                  setSelectedResult(
                                    result,
                                  )
                                }
                                className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-400/20"
                              >
                                View Details
                              </button>

                              <button
                                onClick={() =>
                                  deleteTestResult(
                                    result.id,
                                    result.endpointId,
                                  )
                                }
                                className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-400/20"
                              >
                                Delete
                              </button>

                            </div>

                          </div>
                        );
                      },
                    )}

                  </div>
                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          TEST RESULT DETAILS MODAL
      ======================================================== */}

      {selectedResult &&
        (() => {
          const endpoint =
            endpoints.find(
              (item) =>
                item.id ===
                selectedResult.endpointId,
            );

          return (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-4"
              onClick={() =>
                setSelectedResult(null)
              }
            >

              <div
                className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_0_60px_rgba(34,211,238,0.08)]"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                {/* DETAILS HEADER */}

                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-6">

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-lg font-bold text-white sm:text-xl">
                        Test Result Details
                      </h2>

                      {selectedResult.success ? (
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 sm:text-xs">
                          PASS
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-[10px] font-bold text-red-400 sm:text-xs">
                          FAIL
                        </span>
                      )}

                    </div>

                    {endpoint && (
                      <div className="mt-2 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">

                        <span className="shrink-0 rounded-md bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-400">
                          {endpoint.method}
                        </span>

                        <span className="break-all text-xs leading-5 text-slate-400 sm:text-sm">
                          {endpoint.url}
                        </span>

                      </div>
                    )}

                  </div>

                  <button
                    onClick={() =>
                      setSelectedResult(null)
                    }
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    ✕
                  </button>

                </div>

                {/* DETAILS CONTENT */}

                <div className="overflow-y-auto p-4 sm:p-6">

                  {/* SUMMARY */}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">

                    <DetailCard
                      label="HTTP Status"
                      value={
                        selectedResult.statusCode ??
                        "Error"
                      }
                      valueClass={
                        selectedResult.statusCode !==
                          null &&
                        selectedResult.statusCode >=
                          200 &&
                        selectedResult.statusCode < 400
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    />

                    <DetailCard
                      label="Response Time"
                      value={`${selectedResult.responseTime} ms`}
                      valueClass={
                        endpoint?.maxResponseTime !==
                          null &&
                        endpoint?.maxResponseTime !==
                          undefined &&
                        selectedResult.responseTime >
                          endpoint.maxResponseTime
                          ? "text-orange-400"
                          : "text-cyan-400"
                      }
                    />

                    <DetailCard
                      label="Expected Status"
                      value={
                        endpoint?.expectedStatus ??
                        "Not set"
                      }
                      valueClass="text-violet-400"
                    />

                    <DetailCard
                      label="Max Response Time"
                      value={
                        endpoint?.maxResponseTime !==
                          null &&
                        endpoint?.maxResponseTime !==
                          undefined
                          ? `${endpoint.maxResponseTime} ms`
                          : "Not set"
                      }
                      valueClass="text-orange-400"
                    />

                  </div>

                  {/* BUG INFORMATION */}

                  <div className="mt-5 sm:mt-6">

                    {selectedResult.bugDetected ? (
                      <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 sm:p-5">

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                          <span className="rounded-full bg-red-400/20 px-3 py-1 text-[10px] font-bold text-red-400 sm:text-xs">
                            BUG DETECTED
                          </span>

                          {selectedResult.bugType && (
                            <span className="max-w-full break-all rounded-full bg-slate-950/60 px-3 py-1 text-[10px] font-semibold text-orange-400 sm:text-xs">
                              {
                                selectedResult.bugType
                              }
                            </span>
                          )}

                        </div>

                        {selectedResult.bugMessage && (
                          <p className="mt-3 break-words text-xs leading-5 text-red-300 sm:text-sm sm:leading-6">
                            {
                              selectedResult.bugMessage
                            }
                          </p>
                        )}

                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 sm:p-5">

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">

                          <span className="w-fit rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-bold text-emerald-400 sm:text-xs">
                            NO BUG DETECTED
                          </span>

                          <span className="text-xs leading-5 text-emerald-300 sm:text-sm">
                            API response passed
                            the configured
                            validation rules.
                          </span>

                        </div>

                      </div>
                    )}

                  </div>

                  {/* TEST INFORMATION */}

                  <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:mt-6 sm:p-5">

                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
                      Test Information
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">

                      <div className="min-w-0">

                        <p className="text-xs text-slate-500">
                          Result ID
                        </p>

                        <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-300 sm:text-sm">
                          {
                            selectedResult.id
                          }
                        </p>

                      </div>

                      <div className="min-w-0">

                        <p className="text-xs text-slate-500">
                          Tested At
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-slate-300 sm:text-sm">
                          {new Date(
                            selectedResult.createdAt,
                          ).toLocaleString()}
                        </p>

                      </div>

                      <div className="min-w-0">

                        <p className="text-xs text-slate-500">
                          Endpoint ID
                        </p>

                        <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-300 sm:text-sm">
                          {
                            selectedResult.endpointId
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-slate-500">
                          Overall Result
                        </p>

                        <p
                          className={`mt-1 text-sm font-semibold ${
                            selectedResult.success
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {selectedResult.success
                            ? "PASS"
                            : "FAIL"}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* REQUEST ERROR */}

                  {selectedResult.error && (
                    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 sm:mt-6 sm:p-5">

                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-400 sm:text-sm">
                        Request Error
                      </h3>

                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-300 sm:text-sm sm:leading-6">
                        {
                          selectedResult.error
                        }
                      </pre>

                    </div>
                  )}

                  {/* RESPONSE BODY */}

                  <div className="mt-5 sm:mt-6">

                    <div className="mb-3">

                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
                        Response Body
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        API response captured
                        during this test.
                      </p>

                    </div>

                    <div className="max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#020617]">

                      <pre className="max-h-[300px] max-w-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-cyan-300 sm:max-h-[400px] sm:p-5 sm:text-sm sm:leading-6">
                        {selectedResult.responseBody !==
                          undefined &&
                        selectedResult.responseBody !==
                          null
                          ? JSON.stringify(
                              selectedResult.responseBody,
                              null,
                              2,
                            )
                          : "No response body available."}
                      </pre>

                    </div>

                  </div>

                </div>

                {/* DETAILS FOOTER */}

                <div className="flex shrink-0 border-t border-white/10 p-4 sm:justify-end sm:p-5">

                  <button
                    onClick={() =>
                      setSelectedResult(null)
                    }
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.12)] transition hover:from-cyan-400 hover:to-blue-500 sm:w-auto sm:py-2.5"
                  >
                    Close
                  </button>

                </div>

              </div>
            </div>
          );
        })()}
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
    <div className="min-w-0">

      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-semibold sm:text-base ${
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

// ============================================================
// DETAIL CARD
// ============================================================

function DetailCard({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">

      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-base font-bold sm:text-lg ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

// ============================================================
// SUMMARY BOX
// ============================================================

function SummaryBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "white" | "green" | "red" | "orange";
}) {
  const styles = {
    white: {
      border: "border-white/10",
      bg: "bg-slate-950/60",
      label: "text-slate-500",
      value: "text-white",
    },
    green: {
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/10",
      label: "text-emerald-400",
      value: "text-emerald-400",
    },
    red: {
      border: "border-red-400/20",
      bg: "bg-red-400/10",
      label: "text-red-400",
      value: "text-red-400",
    },
    orange: {
      border: "border-orange-400/20",
      bg: "bg-orange-400/10",
      label: "text-orange-400",
      value: "text-orange-400",
    },
  };

  const style = styles[color];

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} p-3 sm:p-4`}
    >
      <p
        className={`text-[10px] font-medium uppercase tracking-wide sm:text-xs ${style.label}`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold sm:text-2xl ${style.value}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// MOBILE HISTORY ITEM
// ============================================================

function MobileHistoryItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0">

      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold text-slate-300">
        {value}
      </p>

    </div>
  );
}