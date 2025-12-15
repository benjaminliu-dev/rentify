import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { notifyApplicationApproved, notifyApplicationRejected } from "@/app/lib/notifications";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { listingId, applicationId } = await request.json();

        if (!listingId || !applicationId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const listingSnap = await getDoc(doc(firestore, "listings", listingId));

        if (!listingSnap.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        const listingData = listingSnap.data() as any;
        if (listingData?.owner_uuid !== auth.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        const applicationSnap = await getDoc(doc(firestore, "applications", applicationId));

        if (!applicationSnap.exists() || (applicationSnap.data() as any)?.listing_id !== listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const applicationData = applicationSnap.data() as any;
        const approvedApplicantUuid = applicationData.user_uuid;

        // Mark the application as approved
        await updateDoc(doc(firestore, "applications", applicationId), {
            status: "approved",
        });

        // Mark the listing as pending (awaiting item pickup)
        await updateDoc(doc(firestore, "listings", listingId), {
            status: "pending",
            approved_applicant_uuid: approvedApplicantUuid,
        });

        // Reject all other applications for this listing
        const relatedApplications = await getDocs(
            query(collection(firestore, "applications"), where("listing_id", "==", listingId))
        );
        const rejectedApps = relatedApplications.docs.filter((d) => d.id !== applicationId);
        await Promise.all(
            rejectedApps.map((d) => updateDoc(d.ref, { status: "rejected" }))
        );

        // Send notifications
        const listingTitle = listingData.title || "Listing";

        // Notify the approved applicant
        await notifyApplicationApproved(approvedApplicantUuid, listingTitle, listingId, applicationId);

        // Notify rejected applicants
        await Promise.all(
            rejectedApps.map((d) => {
                const appData = d.data() as any;
                return notifyApplicationRejected(appData.user_uuid, listingTitle, listingId, d.id);
            })
        );

        return NextResponse.json({
            approved_application_id: applicationId,
            listing_id: listingId,
            message: "Application approved. Waiting for renter to confirm receipt.",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to approve application";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
