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

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [endpoints, setEndpoints] = useState<Endpoint[]>(
    [],
  );

  const [results, setResults] = useState<TestResult[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  const [runningId, setRunningId] = useState<
    string | null
  >(null);

  const [addingEndpoint, setAddingEndpoint] =
    useState(false);

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [error, setError] = useState("");

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

        const data =
          await response.json();

        allResults.push(
          ...(data as TestResult[]),
        );
      }

      // Newest test first.
      allResults.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

      setResults(
        allResults.slice(0, 10),
      );
    } catch {
      // Keep page usable if history loading fails.
    }
  }

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
          headers as Record<string, string>;
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
        localStorage.getItem("accessToken");

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

      setEndpoints((current) => [
        ...current,
        data,
      ]);

      setEndpointName("");
      setEndpointMethod("GET");
      setEndpointUrl("");
      setEndpointHeaders("");
      setEndpointBody("");

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

  async function runTest(
    endpointId: string,
  ) {
    try {
      setRunningId(endpointId);
      setError("");

      const token =
        localStorage.getItem("accessToken");

      if (!token) {
        window.location.href = "/";
        return;
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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Test failed",
        );
      }

      const newResult: TestResult = {
        id: data.id,
        endpointId: data.endpointId,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        success: data.success,
        responseBody: data.responseBody,
        error: data.error ?? null,
        createdAt: data.createdAt,
      };

      setResults((current) => {
        const updatedResults = [
          newResult,
          ...current.filter(
            (item) =>
              item.id !== newResult.id,
          ),
        ];

        return updatedResults
          .sort(
            (a, b) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          )
          .slice(0, 10);
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

  useEffect(() => {
    loadEndpoints();
  }, [projectId]);

  useEffect(() => {
    if (endpoints.length > 0) {
      loadResults(endpoints);
    } else {
      setResults([]);
    }
  }, [endpoints, projectId]);

  /*
   * Sort endpoints by their latest test.
   *
   * Endpoint with the newest test comes first.
   * Endpoints with no tests go to the bottom.
   */
  const sortedEndpoints = useMemo(() => {
    return [...endpoints].sort(
      (a, b) => {
        const latestA = results.find(
          (result) =>
            result.endpointId === a.id,
        );

        const latestB = results.find(
          (result) =>
            result.endpointId === b.id,
        );

        if (!latestA && !latestB) {
          return 0;
        }

        if (!latestA) {
          return 1;
        }

        if (!latestB) {
          return -1;
        }

        return (
          new Date(
            latestB.createdAt,
          ).getTime() -
          new Date(
            latestA.createdAt,
          ).getTime()
        );
      },
    );
  }, [endpoints, results]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="mb-4 text-sm font-medium text-slate-600 transition hover:text-slate-900"
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

            <button
              onClick={() =>
                setShowAddForm(
                  (current) => !current,
                )
              }
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {showAddForm
                ? "Close Form"
                : "+ Add Endpoint"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Add Endpoint Form */}
        {showAddForm && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Add New Endpoint
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add an API endpoint with
                optional headers and request
                body.
              </p>
            </div>

            <form
              onSubmit={addEndpoint}
              className="space-y-5"
            >
              {/* Name + Method */}
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Headers */}
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Request Body */}
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
  "name": "Gaurav",
  "email": "test@example.com"
}`}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addingEndpoint}
                  className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Endpoints */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Endpoints
            </h2>

            <p className="text-sm text-slate-500">
              {endpoints.length} endpoint
              {endpoints.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          {loading ? (
            <p className="text-slate-500">
              Loading endpoints...
            </p>
          ) : endpoints.length === 0 ? (
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
                          className="shrink-0 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {runningId ===
                          endpoint.id
                            ? "Running..."
                            : "Run Test"}
                        </button>
                      </div>

                      {/* Latest result of this endpoint */}
                      {latestResult && (
                        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
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
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* Test History */}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Test History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Newest tests appear first.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">
                No test results yet.
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
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((result) => {
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
                          {result.statusCode ??
                            "Error"}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
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

                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                          {new Date(
                            result.createdAt,
                          ).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

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