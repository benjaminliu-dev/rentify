import { firestore } from "@/app/lib/firebase_config";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { collection, doc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET: Fetch all notifications for the current user
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const col = collection(firestore, "notifications");
        const q = query(
            col,
            where("user_uuid", "==", auth.uid),
            orderBy("created_at", "desc")
        );
        const docsSnap = await getDocs(q);
        const notifications = docsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return NextResponse.json(notifications);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { notificationIds } = await request.json();

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return NextResponse.json({ error: "notificationIds required" }, { status: 400 });
        }

        await Promise.all(
            notificationIds.map((id: string) =>
                updateDoc(doc(firestore, "notifications", id), { read: true })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

