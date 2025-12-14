import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST } from "@/app/lib/errors";
import { auth, firestore } from "@/app/lib/firebase_config";
import { signInWithCustomToken } from "firebase/auth";
import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

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
        const idToken = request.headers.get("Id-Token");
        if (!idToken) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const credential = await signInWithCustomToken(auth, idToken);
        const body = await request.json();
        const { title, description, image_uris, price } = body ?? {};

        const missingRequired =
            !title ||
            !description ||
            !Array.isArray(image_uris) ||
            image_uris.length === 0 ||
            !price ||
            typeof price.amount !== "number" ||
            !price.unit;

        if (missingRequired) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const col = collection(firestore, "listings");
        const newListing = await addDoc(col, {
            title,
            description,
            image_uris,
            price,
            owner_uuid: credential.user.uid,
            created_at: Timestamp.now(),
            current_tenant_uuid: null,
            status: "pending",
            active: false,
        });
        return NextResponse.json({ id: newListing.id });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create listing";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
