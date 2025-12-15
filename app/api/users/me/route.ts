import { ERROR_ACCESS_DENIED } from "@/app/lib/errors";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { firestore } from "@/app/lib/firebase_config";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const uid = auth.uid;
        const userDoc = await getDoc(doc(firestore, "users", uid));
        const user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;

        const listingsSnap = await getDocs(query(collection(firestore, "listings"), where("owner_uuid", "==", uid)));
        const listings = listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const applicationsSnap = await getDocs(query(collection(firestore, "applications"), where("user_uuid", "==", uid)));
        const applications = applicationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        let requests: any[] = [];
        if (listings.length) {
            const listingIds = listings.map((l: { id: string }) => l.id);
            const requestsResults = await Promise.all(
                listingIds.map((listingId: string) =>
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
        console.error(error);
        const message = error instanceof Error ? error.message : "Unable to fetch user data";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
