export type ListingStatus = "available" | "pending" | "rented";
import { fetchApiRoot } from "@/app/lib/client/apiRoot";

export type ListingPriceDTO = {
  amount: number; // cents (e.g. 120000)
  unit: "day" | "week" | "month";
};

export type ListingDTO = {
  id: string;
  owner_uuid: string;
  active: boolean;
  status: ListingStatus;
  current_tenant_uuid?: string;
  title: string;
  description: string;
  image_uris: string[]; // Firebase Storage URLs
  price: ListingPriceDTO;
  created_at: unknown; // Timestamp from backend
};

export class ApiError extends Error {
  public status: number;
  public bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

function extractListings(payload: unknown): ListingDTO[] {
  if (Array.isArray(payload)) return payload as ListingDTO[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const candidates = [
    obj.listings,
    obj.data,
    (obj.data as any)?.listings,
    (obj.result as any)?.listings,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as ListingDTO[];
  }

  return [];
}

export async function fetchAllListings(options?: { signal?: AbortSignal }) {
  const apiRoot = await fetchApiRoot({ signal: options?.signal });
  const paths = ["api/listing", "api/listings", "api/iisting"];

  let lastError: unknown = null;
  for (const path of paths) {
    const url = new URL(path, apiRoot).toString();
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: options?.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => undefined);
        throw new ApiError(`Failed to fetch listings (${res.status})`, res.status, bodyText);
      }

      const json = (await res.json().catch(() => null)) as unknown;
      return extractListings(json);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch listings");
}


