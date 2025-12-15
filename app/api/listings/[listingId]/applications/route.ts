import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { notifyNewApplication } from "@/app/lib/notifications";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { NextResponse } from "next/server";

type RouteContext = { params: { listingId: string } | Promise<{ listingId: string }> };

interface CreateApplicationRequestBody {
    description: string;
    days_renting: number;
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
    try {
        const resolvedParams = await Promise.resolve(params as any);
        const listingId = resolvedParams?.listingId;
        const auth = await requireUidFromRequest(request);

        if (!listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const listingDoc = await getDoc(doc(firestore, "listings", listingId));
        if (!listingDoc.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        const listingData = listingDoc.data() as any;
        if (listingData?.owner_uuid !== auth.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        const snap = await getDocs(query(collection(firestore, "applications"), where("listing_id", "==", listingId)));
        const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return NextResponse.json(applications);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch applications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
    try {
        const resolvedParams = await Promise.resolve(params as any);
        const listingId = resolvedParams?.listingId;
        const auth = await requireUidFromRequest(request);

        if (!listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = (await request.json()) as Partial<CreateApplicationRequestBody> | null;
        const description = body?.description;
        const days_renting = body?.days_renting;

        if (!isNonEmptyString(description) || typeof days_renting !== "number" || !Number.isFinite(days_renting) || days_renting <= 0) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const listingDoc = await getDoc(doc(firestore, "listings", listingId));
        if (!listingDoc.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        // Optional safeguard: prevent owner from applying to own listing.
        const listingData = listingDoc.data() as any;
        if (listingData?.owner_uuid === auth.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        const newApp = await addDoc(collection(firestore, "applications"), {
            listing_id: listingId,
            user_uuid: auth.uid,
            description: description.trim(),
            days_renting: Math.round(days_renting),
            status: "pending",
            created_at: Timestamp.now(),
        });

        // Notify the owner that they have a new application
        const ownerUuid = listingData?.owner_uuid;
        const listingTitle = listingData?.title || "Listing";
        if (ownerUuid) {
            await notifyNewApplication(ownerUuid, listingTitle, listingId, newApp.id);
        }

        return NextResponse.json({ id: newApp.id });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to submit application";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
