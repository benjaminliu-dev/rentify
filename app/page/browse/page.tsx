"use client";

import Listing from "@/app/components/Listing";
import { withIdTokenHeader } from "@/app/lib/id_token";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function BrowsePage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    // Clear localStorage
    try {
      localStorage.removeItem("idToken");
      localStorage.removeItem("id_token");
      localStorage.removeItem("user_uuid");
      localStorage.removeItem("userUuid");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_neighborhood");
    } catch {
      // ignore
    }
    router.replace("/login");
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/listings",
        withIdTokenHeader({
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
      );
      if (!res.ok) throw new Error(`Failed to fetch listings (${res.status})`);
      const data = (await res.json()) as ListingDTO[];
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      setListings([]);
      setError(e instanceof Error ? e.message : "Failed to fetch listings");
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
    return `${listings.length} results`;
  }, [error, listings.length, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-black dark:to-emerald-950 px-6 py-10 text-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Browse listings
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Explore what's available right now.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {countLabel}
            </span>
            <Link
              href="/page/my_listings"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              My Listings
            </Link>
            <Link
              href="/page/applications"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              My Applications
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Logout
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-black dark:text-zinc-50">
            <div className="font-medium">Couldn’t load listings.</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">{error}</div>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Retry
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[320px] animate-pulse rounded-2xl border border-black/8 bg-white dark:border-white/[.145] dark:bg-black"
                />
              ))
            ) : listings.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-black/8 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
                No listings found.
              </div>
            ) : (
              listings.map((l) => (
                <Link key={l.id} href={`/page/listing/${l.id}`} className="block">
                  <Listing
                    title={l.title || "Untitled"}
                    description={l.description || "No description available"}
                    ownerName="Listed by owner"
                    imageUri={l.image_uris?.[0] ?? null}
                    priceLabel={formatPriceLabel(l.price)}
                    status={l.status}
                  />
                </Link>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}

