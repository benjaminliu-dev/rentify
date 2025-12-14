"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApplicationStatus = "pending" | "approved" | "rejected";

type ApplicationDTO = {
  id: string;
  listing_id: string;
  user_uuid: string;
  description: string;
  days_renting: number;
  status: ApplicationStatus;
  created_at: unknown;
};

function statusBadgeClasses(status: ApplicationStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200";
  }
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/me/applications", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to fetch applications (${res.status})`);
      const data = (await res.json()) as ApplicationDTO[];
      setApps(Array.isArray(data) ? data : []);
    } catch (e) {
      setApps([]);
      setError(e instanceof Error ? e.message : "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "—";
    return `${apps.length} applications`;
  }, [apps.length, error, loading]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-black dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your applications
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Track the status of each application you’ve submitted.
            </p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {countLabel}
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-black dark:text-zinc-50">
            <div className="font-medium">Couldn’t load applications.</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">{error}</div>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-24 animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black"
              />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-2xl border border-black/8 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
            You don’t have any applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                          statusBadgeClasses(a.status),
                        ].join(" ")}
                      >
                        {a.status}
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {a.days_renting} days
                      </span>
                    </div>

                    <div className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {a.description}
                    </div>

                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">Listing:</span>{" "}
                      <Link
                        href={`/page/listing/${a.listing_id}`}
                        className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
                      >
                        {a.listing_id}
                      </Link>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
                    <div>
                      <span className="font-medium">Application ID:</span>{" "}
                      {a.id}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">User:</span>{" "}
                      {a.user_uuid.slice(0, 8)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

