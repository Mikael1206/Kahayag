"use client";

import {
  PORTAL_STATUS_LABEL,
  nextPortalStatus,
  reportsToCsv,
  type PortalStatus,
} from "@/lib/portalStatus";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Official = {
  barangayName: string;
  municipality: string;
  role: string;
};

type Report = {
  id: string;
  lat: number;
  lng: number;
  categoryLabel: string;
  status: PortalStatus;
  confirmCount: number;
  createdAt: string;
};

type Corridor = { key: string; count: number; latestAt: string; lat: number; lng: number };

export default function PortalPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<"unknown" | "guest" | "in">("unknown");
  const [official, setOfficial] = useState<Official | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    const response = await fetch("/api/portal/reports", { credentials: "include" });
    if (response.status === 401 || response.status === 403) {
      setAuth("guest");
      setOfficial(null);
      setStatus("idle");
      if (response.status === 403) {
        const payload = (await response.json()) as { error?: string };
        setErrorMessage(payload.error || "This account is not linked to a barangay.");
      }
      return;
    }
    const payload = (await response.json()) as {
      official?: Official;
      reports?: Report[];
      corridors?: Corridor[];
      resolvedCount?: number;
      error?: string;
    };
    if (!response.ok) {
      setAuth("guest");
      setStatus("error");
      setErrorMessage(payload.error || "Could not load reports.");
      return;
    }
    setAuth("in");
    setOfficial(payload.official ?? null);
    setReports(payload.reports ?? []);
    setCorridors(payload.corridors ?? []);
    setResolvedCount(payload.resolvedCount ?? 0);
    setStatus("idle");
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    const response = await fetch("/api/portal/session", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as { official?: Official; error?: string };
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(payload.error || "Could not sign in.");
      return;
    }
    setOfficial(payload.official ?? null);
    setAuth("in");
    await loadReports();
  }

  async function advance(report: Report) {
    const next = nextPortalStatus(report.status);
    if (!next) return;
    setStatus("loading");
    const response = await fetch("/api/portal/reports", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: report.id, status: next }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(payload.error || "Could not update the report.");
      return;
    }
    await loadReports();
  }

  const selected = reports.find((report) => report.id === selectedId) ?? null;
  const openReports = reports.filter((report) => report.status !== "resolved");

  return (
    <div className="min-h-dvh bg-[#0F172A] px-4 py-6 text-[#E2E8F0]">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-medium">Barangay portal</h1>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-md px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
        >
          Back to map
        </Link>
      </header>

      {auth === "unknown" ? (
        <p role="status" className="mx-auto mt-8 max-w-md">
          Checking session…
        </p>
      ) : auth !== "in" ? (
        <form
          onSubmit={(event) => void login(event)}
          className="mx-auto mt-8 max-w-md space-y-3 rounded-md bg-[#1E293B] p-4 print:hidden"
        >
          <p className="text-sm text-[#CBD5E1]">
            Sign in with the official account created in Supabase Auth. The account must have a
            matching row in barangay_users.
          </p>
          {status === "loading" ? (
            <p role="status">Signing in…</p>
          ) : null}
          {errorMessage ? (
            <p role="alert" className="text-[#F59E0B]">
              {errorMessage}
            </p>
          ) : null}
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md bg-[#0F172A] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md bg-[#0F172A] px-2 text-[#E2E8F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#F59E0B] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] disabled:opacity-60"
          >
            Sign in
          </button>
        </form>
      ) : (
        <main className="mx-auto mt-6 max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p>
              {official?.barangayName}, {official?.municipality} · {official?.role}
            </p>
            <p>Resolved in this barangay: {resolvedCount}</p>
            <button
              type="button"
              onClick={() => {
                void fetch("/api/portal/session", { method: "DELETE", credentials: "include" }).then(
                  () => {
                    setAuth("guest");
                    setOfficial(null);
                    setReports([]);
                  }
                );
              }}
              className="inline-flex min-h-12 items-center rounded-md bg-[#1E293B] px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              Sign out
            </button>
          </div>

          {status === "loading" ? <p role="status">Loading reports…</p> : null}
          {status === "error" ? (
            <p role="alert" className="text-[#F59E0B]">
              {errorMessage}
            </p>
          ) : null}

          <section>
            <h2 className="mb-2 text-lg font-medium">Top dark corridors</h2>
            {corridors.length === 0 ? (
              <p>No open reports to rank yet.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5">
                {corridors.slice(0, 8).map((corridor) => (
                  <li key={corridor.key}>
                    {corridor.count} report{corridor.count === 1 ? "" : "s"} near {corridor.lat},{" "}
                    {corridor.lng}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section id="work-order">
            <div className="mb-2 flex flex-wrap gap-2 print:hidden">
              <h2 className="text-lg font-medium">Work order</h2>
              <button
                type="button"
                onClick={() => {
                  const csv = reportsToCsv(
                    openReports.map((report) => ({
                      id: report.id,
                      category: report.categoryLabel,
                      status: report.status,
                      lat: report.lat,
                      lng: report.lng,
                      confirmCount: report.confirmCount,
                      createdAt: report.createdAt,
                    }))
                  );
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "kahayag-work-order.csv";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex min-h-12 items-center rounded-md bg-[#10B981] px-4 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-12 items-center rounded-md bg-[#1E293B] px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              >
                Print / Save as PDF
              </button>
            </div>
            {reports.length === 0 && status !== "loading" ? (
              <p>No reports in this barangay yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="py-2 pr-2">Category</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Confirmations</th>
                      <th className="py-2 pr-2">Reported</th>
                      <th className="py-2 print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className={`border-b border-[#334155] ${
                          selectedId === report.id ? "bg-[#1E293B]" : ""
                        }`}
                      >
                        <td className="py-2 pr-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(report.id)}
                            className="text-left underline decoration-[#F59E0B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                          >
                            {report.categoryLabel}
                          </button>
                        </td>
                        <td className="py-2 pr-2">{PORTAL_STATUS_LABEL[report.status]}</td>
                        <td className="py-2 pr-2">{report.confirmCount}</td>
                        <td className="py-2 pr-2">{report.createdAt.slice(0, 10)}</td>
                        <td className="py-2 print:hidden">
                          {nextPortalStatus(report.status) ? (
                            <button
                              type="button"
                              onClick={() => void advance(report)}
                              className="inline-flex min-h-12 items-center rounded-md bg-[#F59E0B] px-3 font-medium text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                            >
                              Mark {PORTAL_STATUS_LABEL[nextPortalStatus(report.status)!]}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selected ? (
            <section className="rounded-md bg-[#1E293B] p-4 print:hidden">
              <h2 className="text-lg font-medium">Selected report</h2>
              <p>{selected.categoryLabel}</p>
              <p>{PORTAL_STATUS_LABEL[selected.status]}</p>
              <p>
                {selected.lat}, {selected.lng}
              </p>
              <p>{selected.confirmCount} confirmation{selected.confirmCount === 1 ? "" : "s"}</p>
            </section>
          ) : null}
        </main>
      )}
    </div>
  );
}
