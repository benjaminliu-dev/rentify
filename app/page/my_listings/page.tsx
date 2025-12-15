"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getIdToken, withIdTokenHeader } from "@/app/lib/id_token";
import { useCallback, useEffect, useState } from "react";

type ListingDTO = {
  id: string;
  title: string;
  description: string;
  status: string;
  active: boolean;
  price: {
    amount: number;
    unit: string;
  };
  image_uris: string[];
};

type CreateListingFormState = {
  title: string;
  description: string;
  imageUri: string;
  priceDollarsPerDay: string;
  active: boolean;
};

type ApplicationDTO = {
  id: string;
  listing_id: string;
  user_uuid: string;
  status: string;
  description: string;
  days_renting: number;
  created_at: unknown;
};

type UserDataDTO = {
  user: {
    uuid: string;
    name: string;
    email: string;
    neighborhood: string;
  } | null;
  listings: ListingDTO[];
  applications: ApplicationDTO[];
  requests: ApplicationDTO[];
};

export default function MyListingsPage() {
  const router = useRouter();
  const [data, setData] = useState<UserDataDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<CreateListingFormState>({
    title: "",
    description: "",
    imageUri: "",
    priceDollarsPerDay: "",
    active: false,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = getIdToken();
      if (!idToken) {
        // Not logged in -> send to login page.
        router.replace("/login");
        return;
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
      if (!res.ok) throw new Error(`Failed to fetch data (${res.status})`);
      const responseData = await res.json();
      setData(responseData);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCreate = useCallback(async () => {
    setCreateError(null);
    setCreateSuccess(null);

    const idToken = getIdToken();
    if (!idToken) {
      router.replace("/login");
      return;
    }

    const title = createState.title.trim();
    const description = createState.description.trim();
    const imageUri = createState.imageUri.trim();
    const dollars = Number(createState.priceDollarsPerDay);

    if (!title) {
      setCreateError("Please enter a title.");
      return;
    }
    if (!description) {
      setCreateError("Please enter a description.");
      return;
    }
    if (!imageUri) {
      setCreateError("Please enter at least one image URL.");
      return;
    }
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setCreateError("Please enter a valid price per day (must be > 0).");
      return;
    }

    setCreateSubmitting(true);
    try {
      const body = {
        title,
        description,
        image_uris: [imageUri],
        price: { amount: Math.round(dollars * 100), unit: "day" as const },
        active: createState.active,
      };

      const res = await fetch(
        "/api/listings",
        withIdTokenHeader(
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify(body),
          },
          idToken
        )
      );
      if (!res.ok) {
        const maybe = await res.json().catch(() => null);
        const msg =
          maybe && typeof maybe === "object" && "error" in maybe
            ? String((maybe as any).error)
            : `Failed to create listing (${res.status})`;
        throw new Error(msg);
      }

      setCreateSuccess("Listing created.");
      setCreateOpen(false);
      setCreateState({
        title: "",
        description: "",
        imageUri: "",
        priceDollarsPerDay: "",
        active: false,
      });
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create listing");
    } finally {
      setCreateSubmitting(false);
    }
  }, [createState, load, router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-black dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Listings</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your rental listings and view incoming requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/page/browse"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Browse
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateSuccess(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Create listing
            </button>
          </div>
        </header>

        {createSuccess ? (
          <div className="mb-6 rounded-2xl border border-emerald-600/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
            {createSuccess}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-black dark:text-zinc-50">
            <div className="font-medium">Couldn't load data.</div>
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
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black" />
            <div className="h-48 animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black" />
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-black/8 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
            No data found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* My Listings Section */}
            <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <h2 className="text-lg font-semibold mb-4">Your Listings</h2>
              {data.listings.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  You haven't created any listings yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.listings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/page/listing/${listing.id}`}
                      className="block rounded-xl border border-black/8 bg-zinc-50 p-4 hover:bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-zinc-800 transition"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {listing.title || "Untitled"}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {listing.description || "No description"}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 font-medium ring-1 ring-inset capitalize ${
                              listing.status === 'available' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                              listing.status === 'rented' ? 'bg-zinc-100 text-zinc-700 ring-zinc-600/20' :
                              'bg-amber-50 text-amber-700 ring-amber-600/20'
                            }`}>
                              {listing.status}
                            </span>
                            <span className="text-zinc-500">
                              {listing.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-medium whitespace-nowrap">
                          ${(listing.price?.amount / 100).toFixed(0)}/day
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Requests Section */}
            <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <h2 className="text-lg font-semibold mb-4">Incoming Requests</h2>
              {data.requests.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  No requests for your listings yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-black/8 bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-900"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${
                              request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                              request.status === 'rejected' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' :
                              'bg-amber-50 text-amber-700 ring-amber-600/20'
                            }`}>
                              {request.status}
                            </span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                              {request.days_renting} {request.days_renting === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {request.description || "No description provided"}
                          </p>
                          <Link
                            href={`/page/listing/${request.listing_id}`}
                            className="mt-2 inline-block text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 underline underline-offset-2"
                          >
                            View listing →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create listing"
          onClick={() => {
            if (!createSubmitting) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-5 shadow-lg dark:border-white/[.145] dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  Create a new listing
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Add a title, description, price, and at least one image URL.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
                className="rounded-full px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input
                  value={createState.title}
                  onChange={(e) => setCreateState((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Compact stroller"
                  disabled={createSubmitting}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={createState.description}
                  onChange={(e) =>
                    setCreateState((s) => ({ ...s, description: e.target.value }))
                  }
                  rows={4}
                  placeholder="Describe what you’re renting out, pickup details, condition, etc."
                  disabled={createSubmitting}
                  className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Price / day (USD)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    value={createState.priceDollarsPerDay}
                    onChange={(e) =>
                      setCreateState((s) => ({
                        ...s,
                        priceDollarsPerDay: e.target.value,
                      }))
                    }
                    placeholder="25"
                    disabled={createSubmitting}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={createState.active}
                      onChange={(e) =>
                        setCreateState((s) => ({ ...s, active: e.target.checked }))
                      }
                      disabled={createSubmitting}
                      className="h-4 w-4 rounded border-black/20"
                    />
                    Make active immediately
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Image URL
                </label>
                <input
                  value={createState.imageUri}
                  onChange={(e) =>
                    setCreateState((s) => ({ ...s, imageUri: e.target.value }))
                  }
                  placeholder="https://…"
                  disabled={createSubmitting}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/[.145]"
                />
              </div>

              {createError ? (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200">
                  {createError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={createSubmitting}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitCreate()}
                  disabled={createSubmitting}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  {createSubmitting ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
