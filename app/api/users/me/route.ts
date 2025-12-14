import { ERROR_ACCESS_DENIED } from "@/app/lib/errors";
import { auth, firestore } from "@/app/lib/firebase_config";
import { signInWithCustomToken } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
    try {
        const idToken = request.headers.get("Id-Token");
        if (!idToken) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const credential = await signInWithCustomToken(auth, idToken);
        if (!credential?.user) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const uid = credential.user.uid;

        const userDoc = await getDoc(doc(firestore, "users", uid));
        const user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;

        const listingsSnap = await getDocs(query(collection(firestore, "listings"), where("owner_uuid", "==", uid)));
        const listings = listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const applicationsSnap = await getDocs(query(collection(firestore, "applications"), where("user_uuid", "==", uid)));
        const applications = applicationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        let requests: any[] = [];
        if (listings.length) {
            const listingIds = listings.map((l) => l.id);
            const requestsResults = await Promise.all(
                listingIds.map((listingId) =>
                    getDocs(query(collection(firestore, "applications"), where("listing_id", "==", listingId)))
                )
            );
            requests = requestsResults.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }

        return NextResponse.json({
            user,
            listings,
            applications,
            requests,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch user data";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
