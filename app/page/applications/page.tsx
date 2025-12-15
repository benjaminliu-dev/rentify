"use client";

import Link from "next/link";
import { getIdToken, withIdTokenHeader } from "@/app/lib/id_token";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApplicationStatus = "pending" | "approved" | "rejected" | "confirmed" | "paid";

type ApplicationDTO = {
  id: string;
  listing_id: string;
  user_uuid: string;
  description: string;
  days_renting: number;
  status: ApplicationStatus;
  created_at: unknown;
};

function formatDate(value: unknown): string {
  if (!value) return "—";
  // Handle Firestore Timestamp objects
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000).toLocaleDateString();
  }
  // Handle ISO strings
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  // Handle Date objects
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toLocaleDateString();
  }
  return "—";
}

function statusBadgeClasses(status: ApplicationStatus) {
  switch (status) {
    case "approved":
      return "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-200";
    case "confirmed":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200";
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "pending":
      return "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-800 dark:text-zinc-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200";
  }
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = getIdToken();
      if (!idToken) {
        throw new Error('Missing authentication token in localStorage');
      }

      const res = await fetch(
        "/api/users/me",
        withIdTokenHeader(
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
          idToken
        )
      );
      if (!res.ok) throw new Error(`Failed to fetch applications (${res.status})`);
      const data = await res.json();
      // Extract the applications array from the response data
      const applications = data && typeof data === "object" && Array.isArray(data.applications) ? data.applications : [];
      setApps(applications);
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

  const confirmReceipt = useCallback(async (applicationId: string) => {
    setConfirmError(null);
    setConfirmingId(applicationId);

    try {
      const idToken = getIdToken();
      if (!idToken) {
        throw new Error("Not logged in");
      }

      const res = await fetch(
        "/api/confirmReceipt",
        withIdTokenHeader(
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ applicationId }),
          },
          idToken
        )
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error || `Failed to confirm (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();

      // Redirect to payment link
      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        // Fallback: reload to get updated status
        await load();
      }
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Failed to confirm receipt");
    } finally {
      setConfirmingId(null);
    }
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
              Track the status of each application you've submitted.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {countLabel}
            </span>
            <Link
              href="/page/browse"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Browse
            </Link>
            <Link
              href="/page/my_listings"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              My Listings
            </Link>
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
            You don't have any applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {confirmError && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200">
                {confirmError}
              </div>
            )}
            {apps.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                          statusBadgeClasses(a.status),
                        ].join(" ")}
                      >
                        {a.status === "paid" ? "completed" : a.status === "confirmed" ? "awaiting payment" : a.status === "approved" ? "approved, awaiting pickup" : a.status}
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {a.days_renting} days
                      </span>
                    </div>

                    {a.status === "approved" && (
                      <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                        <span className="font-medium">Your application was approved!</span>{" "}
                        Pick up the item, then confirm receipt and pay below.
                      </div>
                    )}

                    <div className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {a.description}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Link
                        href={`/page/listing/${a.listing_id}`}
                        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        View listing →
                      </Link>

                      {a.status === "approved" && (
                        <button
                          type="button"
                          onClick={() => void confirmReceipt(a.id)}
                          disabled={confirmingId !== null}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {confirmingId === a.id ? "Processing…" : "✓ Confirm Receipt & Pay"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="capitalize">
                      <span className="font-medium">Status:</span>{" "}
                      {a.status === "confirmed" ? "received" : a.status}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">Applied:</span>{" "}
                      {formatDate(a.created_at)}
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

