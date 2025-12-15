import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST } from "@/app/lib/errors";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { firestore } from "@/app/lib/firebase_config";
import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

type ListingStatus = "available" | "pending" | "rented";
type ListingPriceUnit = "day" | "week" | "month";

interface ListingPrice {
    amount: number; // cents
    unit: ListingPriceUnit;
}

// Request body contract for creating a listing from the client.
export interface CreateListingRequestBody {
    title: string;
    description: string;
    image_uris: string[];
    price: ListingPrice;
    // Optional; defaults to false if omitted.
    active?: boolean;
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

function isListingPrice(v: unknown): v is ListingPrice {
    if (!v || typeof v !== "object") return false;
    const maybe = v as { amount?: unknown; unit?: unknown };
    const unitOk = maybe.unit === "day" || maybe.unit === "week" || maybe.unit === "month";
    return typeof maybe.amount === "number" && Number.isFinite(maybe.amount) && maybe.amount >= 0 && unitOk;
}

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
    try {
        const col = collection(firestore, "listings");
        const docsSnap = await getDocs(col);
        const listings = docsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(listings);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch listings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const body = (await request.json()) as Partial<CreateListingRequestBody> | null;

        const title = body?.title;
        const description = body?.description;
        const image_uris = body?.image_uris;
        const price = body?.price;
        const active = Boolean(body?.active);

        const valid =
            isNonEmptyString(title) &&
            isNonEmptyString(description) &&
            Array.isArray(image_uris) &&
            image_uris.length > 0 &&
            image_uris.every(isNonEmptyString) &&
            isListingPrice(price);

        if (!valid) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const status: ListingStatus = "available";

        const col = collection(firestore, "listings");
        const newListing = await addDoc(col, {
            title,
            description,
            image_uris,
            price,
            owner_uuid: auth.uid,
            created_at: Timestamp.now(),
            current_tenant_uuid: null,
            status,
            active,
        });
        return NextResponse.json({ id: newListing.id });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create listing";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
