import { firestore } from "@/app/lib/firebase_config";
import { notifyPaymentCompleted } from "@/app/lib/notifications";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
    const url = new URL(request.url);
    const listingId = url.searchParams.get("listingId");
    const applicationId = url.searchParams.get("applicationId");
    const token = url.searchParams.get("token");

    // If we have all the params, update the listing status directly
    // (Stripe webhooks don't work locally without a tunnel)
    if (listingId && applicationId && token) {
        try {
            // Validate the secure token
            const secureSnap = await getDoc(doc(firestore, "secureStrings", token));
            if (secureSnap.exists()) {
                const secureData = secureSnap.data();
                if (
                    secureData &&
                    secureData.listingId === listingId &&
                    secureData.applicationId === applicationId
                ) {
                    const applicantUuid = secureData.applicantUuid;

                    // Get listing data for notifications
                    const listingSnap = await getDoc(doc(firestore, "listings", listingId));
                    const listingData = listingSnap.exists() ? (listingSnap.data() as any) : null;
                    const listingTitle = listingData?.title || "Listing";
                    const ownerUuid = listingData?.owner_uuid;

                    // Update listing to rented
                    await updateDoc(doc(firestore, "listings", listingId), {
                        current_tenant_uuid: applicantUuid,
                        status: "rented",
                        active: false,
                    });

                    // Mark the application as paid
                    await updateDoc(doc(firestore, "applications", applicationId), {
                        status: "paid",
                        paid_at: new Date().toISOString(),
                    });

                    // Notify both parties that payment is complete
                    if (applicantUuid) {
                        await notifyPaymentCompleted(applicantUuid, listingTitle, listingId, applicationId, false);
                    }
                    if (ownerUuid) {
                        await notifyPaymentCompleted(ownerUuid, listingTitle, listingId, applicationId, true);
                    }

                    // Delete the secure token (one-time use)
                    await deleteDoc(doc(firestore, "secureStrings", token));
                }
            }
        } catch (error) {
            console.error("Error updating listing after payment:", error);
            // Continue to redirect even if there's an error - webhook might handle it
        }
    }

    return NextResponse.redirect(new URL("/page/browse", request.url));
}
