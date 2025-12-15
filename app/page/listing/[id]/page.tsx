"use client";

import Image from "next/image";
import { getIdToken, withIdTokenHeader } from "@/app/lib/id_token";
import { useCallback, useEffect, useMemo, useState } from "react";

type ListingStatus = "available" | "pending" | "rented";
type ListingPrice = {
  amount: number; // cents
  unit: "day" | "week" | "month";
};

type ListingDTO = {
  id: string;
  owner_uuid: string;
  active: boolean;
  status: ListingStatus;
  current_tenant_uuid?: string;
  title: string;
  description: string;
  image_uris: string[];
  price: ListingPrice;
  created_at: unknown;
};

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

function getUserUuidFromLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return (
      localStorage.getItem("user_uuid") ||
      localStorage.getItem("userUuid") ||
      localStorage.getItem("uuid") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("userId")
    );
  } catch {
    return null;
  }
}

function formatPriceLabel(price: ListingDTO["price"]) {
  if (!price || typeof price.amount !== 'number') {
    return "Price not available";
  }
  const dollars = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price.amount / 100);
  return `${dollars} / day`;
}

function statusBadgeClasses(status: ListingStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200";
    case "rented":
      return "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900 dark:text-zinc-200";
  }
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appsLoaded, setAppsLoaded] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyDescription, setApplyDescription] = useState("");
  const [applyDays, setApplyDays] = useState<number>(7);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(id)}`,
        withIdTokenHeader({
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
      );
      if (!res.ok) throw new Error(`Failed to fetch listing (${res.status})`);
      const data = (await res.json()) as ListingDTO;
      setListing(data && typeof data === "object" ? data : null);
    } catch (e) {
      setListing(null);
      setError(e instanceof Error ? e.message : "Failed to fetch listing");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const idToken = getIdToken();

      // Skip loading applications if no token (user not logged in or not the owner)
      if (!idToken) {
        setAppsError("Login required to view applications");
        setApplications([]);
        setAppsLoading(false);
        return;
      }

      const res = await fetch(
        `/api/listings/${encodeURIComponent(id)}/applications`,
        withIdTokenHeader(
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
          idToken
        )
      );

      // If 403, user is not the owner - this is okay
      if (res.status === 403) {
        setApplications([]);
        setAppsError(null);
        setAppsLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch applications (${res.status})`);
      const data = (await res.json()) as ApplicationDTO[];
      setApplications(Array.isArray(data) ? data : []);
      setAppsLoaded(true);
    } catch (e) {
      setApplications([]);
      setAppsError(e instanceof Error ? e.message : "Failed to fetch applications");
    } finally {
      setAppsLoading(false);
    }
  }, [id]);

  const submitApplication = useCallback(async () => {
    setApplyError(null);
    setApplySuccess(null);

    const user_uuid = getUserUuidFromLocalStorage();
    if (!user_uuid) {
      setApplyError('Missing user UUID in localStorage (expected key like "user_uuid").');
      return;
    }

    const description = applyDescription.trim();
    const days = Number.isFinite(applyDays) ? applyDays : 0;
    if (!description) {
      setApplyError("Please enter a description.");
      return;
    }
    if (!days || days <= 0) {
      setApplyError("Please enter days renting (must be > 0).");
      return;
    }

    setApplySubmitting(true);
    try {
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `app_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const body: ApplicationDTO = {
        id: newId,
        listing_id: id,
        user_uuid,
        description,
        days_renting: days,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const res = await fetch(
        `/api/listings/${encodeURIComponent(id)}/applications`,
        withIdTokenHeader({
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify(body),
        })
      );
      if (!res.ok) throw new Error(`Failed to submit application (${res.status})`);

      setApplySuccess("Application submitted.");
      setApplyOpen(false);
      setApplyDescription("");
      setApplyDays(7);
      await loadApplications();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Failed to submit application");
    } finally {
      setApplySubmitting(false);
    }
  }, [applyDays, applyDescription, id, loadApplications]);

  const approveApplication = useCallback(async (applicationId: string) => {
    setApproveError(null);
    setApprovingId(applicationId);

    const idToken = getIdToken();
    if (!idToken) {
      setApproveError("Not logged in");
      setApprovingId(null);
      return;
    }

    try {
      const res = await fetch(
        "/api/approveApplication",
        withIdTokenHeader(
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ listingId: id, applicationId }),
          },
          idToken
        )
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error || `Failed to approve (${res.status})`;
        throw new Error(msg);
      }

      // Refresh listing and applications to show updated status
      await load();
      await loadApplications();
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Failed to approve application");
    } finally {
      setApprovingId(null);
    }
  }, [id, load, loadApplications]);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) {
      void load();
    }
  }, [id, load]);

  const headerRight = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "—";
    return listing ? "Listed by owner" : "—";
  }, [error, listing, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-black dark:to-emerald-950 px-6 py-10 text-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Listing</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{id}</p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {headerRight}
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-black dark:text-zinc-50">
            <div className="font-medium">Couldn’t load listing.</div>
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-[420px] animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black" />
            </div>
            <div className="h-[240px] animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black" />
          </div>
        ) : !listing ? (
          <div className="rounded-2xl border border-black/8 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
            Listing not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black">
                <div className="relative aspect-16/10 w-full bg-zinc-100 dark:bg-zinc-900">
                  {listing.image_uris?.[0] ? (
                    <Image
                      src={listing.image_uris[0]}
                      alt={listing.title}
                      fill
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </div>

                {listing.image_uris?.length > 1 ? (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {listing.image_uris.slice(0, 4).map((uri) => (
                      <div
                        key={uri}
                        className="relative aspect-4/3 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
                      >
                        <Image
                          src={uri}
                          alt={listing.title}
                          fill
                          sizes="(min-width: 1024px) 16vw, 25vw"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="h-fit rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold leading-7 tracking-tight">
                  {listing.title}
                </h2>
                <div className="shrink-0 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-900 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/[.145]">
                  {formatPriceLabel(listing.price)}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                    statusBadgeClasses(listing.status),
                  ].join(" ")}
                >
                  {listing.status}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {listing.active ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {listing.description}
              </p>

              {listing.owner_uuid !== getUserUuidFromLocalStorage() && (
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyError(null);
                      setApplySuccess(null);
                      setApplyOpen(true);
                    }}
                    className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                  >
                    Apply
                  </button>
                </div>
              )}

              {applySuccess ? (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {applySuccess}
                </div>
              ) : null}

              <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-700 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[.145]">
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="capitalize">{listing.status}</span>
                </div>
                <div className="mt-1">
                  <span className="font-medium">Active:</span>{" "}
                  {listing.active ? "Yes" : "No"}
                </div>
                {listing.current_tenant_uuid && (
                  <div className="mt-1">
                    <span className="font-medium">Currently Rented:</span> Yes
                  </div>
                )}
              </div>

              {listing?.owner_uuid === getUserUuidFromLocalStorage() ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Applications</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {appsLoading ? "Loading…" : appsLoaded ? `${applications.length}` : "—"}
                    </div>
                  </div>

                  {!appsLoaded ? (
                    <button
                      type="button"
                      onClick={() => void loadApplications()}
                      disabled={appsLoading}
                      className="inline-flex w-full items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      {appsLoading ? "Loading…" : "Load applications"}
                    </button>
                  ) : null}

                  {appsError ? (
                    <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[.145]">
                      {appsError}
                    </div>
                  ) : null}

                  {approveError ? (
                    <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200">
                      {approveError}
                    </div>
                  ) : null}

                  {appsLoaded ? (
                    applications.length === 0 ? (
                      <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[.145]">
                        No applications yet.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {applications.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[.145]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium capitalize">
                                {a.status} • {a.days_renting}{" "}
                                {a.days_renting === 1 ? "day" : "days"}
                              </div>
                              {a.status === "pending" ? (
                                <button
                                  type="button"
                                  onClick={() => void approveApplication(a.id)}
                                  disabled={approvingId !== null}
                                  className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {approvingId === a.id ? "Approving…" : "Approve"}
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-400">
                              {a.description || "No description provided"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </div>

      {applyOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Apply to listing"
          onClick={() => {
            if (!applySubmitting) setApplyOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-5 shadow-lg dark:border-white/[.145] dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  Apply to this listing
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Tell the owner why you’re a good fit.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                disabled={applySubmitting}
                className="rounded-full px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Days renting
                </label>
                <input
                  type="number"
                  min={1}
                  value={applyDays}
                  onChange={(e) => setApplyDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={applyDescription}
                  onChange={(e) => setApplyDescription(e.target.value)}
                  rows={5}
                  placeholder="Introduce yourself, your timeline, and any relevant details…"
                  className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                />
              </div>

              {applyError ? (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200">
                  {applyError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  disabled={applySubmitting}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitApplication()}
                  disabled={applySubmitting}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  {applySubmitting ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



