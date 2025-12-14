"use client";

import { useCallback, useEffect, useState } from "react";

type UserMeDTO = {
  uuid: string;
  name: string;
  email: string;
  neighborhood: string;
  role: string;
  created_at: unknown;
  stripe_customer_id?: string;
};

export default function RequestsPage() {
  const [user, setUser] = useState<UserMeDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userUuid = (() => {
        try {
          return localStorage.getItem("user_uuid");
        } catch {
          return null;
        }
      })();
      if (!userUuid) {
        throw new Error('Missing "user_uuid" in localStorage');
      }

      const res = await fetch("/api/user/me", {
        method: "GET",
        headers: { Accept: "application/json", user_uuid: userUuid },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to fetch user (${res.status})`);
      const data = await res.json();
      // Extract the listings array from the response data, if present
      const listings = data && typeof data === "object" && Array.isArray(data.listings) ? data.listings : [];
      setUser(data && typeof data === "object" ? data : null);
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-black dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            (Mock) Fetching `/api/user/me` on mount. Showing user "listings" field (if present).
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-black dark:text-zinc-50">
            <div className="font-medium">Couldn’t load user.</div>
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
          <div className="h-28 animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black" />
        ) : !user ? (
          <div className="rounded-2xl border border-black/8 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
            No user found.
          </div>
        ) : (
          <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/[.145] dark:bg-black">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </div>
            {/* Show listings if present */}
            {"listings" in user && Array.isArray((user as any).listings) && (
              <div className="mt-6">
                <h2 className="text-base font-semibold mb-2">Listings</h2>
                {(user as any).listings.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">No listings found.</div>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(user as any).listings.map((listing: any) => (
                      <li key={listing.id} className="py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="font-medium">{listing.title || <span className="italic">Untitled</span>}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            ID: {listing.id}
                          </span>
                          {listing.status && (
                            <span className="inline-block text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 ml-auto">
                              {listing.status}
                            </span>
                          )}
                        </div>
                        {listing.description && (
                          <div className="text-xs mt-1 text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {listing.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-700 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/[.145]">
              <pre className="whitespace-pre-wrap wrap-break-word">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}