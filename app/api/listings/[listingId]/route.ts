import { ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: { listingId: string } }): Promise<NextResponse> {
    try {
        const { listingId } = context.params ?? {};
        if (!listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const docRef = await getDoc(doc(firestore, "listings", listingId));

        if (!docRef.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ id: docRef.id, ...docRef.data() });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch listing";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
