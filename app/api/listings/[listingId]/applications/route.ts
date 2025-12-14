import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { auth, firestore } from "@/app/lib/firebase_config";
import { signInWithCustomToken } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { listingId: string } }): Promise<NextResponse> {
    try {
        const { listingId } = params ?? {};
        const idToken = request.headers.get("Id-Token");

        if (!listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        if (!idToken) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const credential = await signInWithCustomToken(auth, idToken);

        if (!credential.user) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const listingDoc = await getDoc(doc(firestore, "listings", listingId));
        if (!listingDoc.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        if (listingDoc.data().owner_uuid !== credential.user.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        const applicationsRef = collection(firestore, "applications");
        const q = query(applicationsRef, where("listing_id", "==", listingId));
        const querySnapshot = await getDocs(q);
        const applications = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json(applications);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch applications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
