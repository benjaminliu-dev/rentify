import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { notifyReceiptConfirmed } from "@/app/lib/notifications";
import { requireUidFromRequest } from "@/app/lib/require_uid";
import { stripe } from "@/app/lib/stripe_config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function generateSecureRandomString(length: number): string {
    const arr = new Uint8Array(length);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(arr);
    } else {
        for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const auth = await requireUidFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { applicationId } = await request.json();

        if (!applicationId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        // Get the application
        const applicationSnap = await getDoc(doc(firestore, "applications", applicationId));

        if (!applicationSnap.exists()) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const applicationData = applicationSnap.data() as any;

        // Only the renter who owns this application can confirm receipt
        if (applicationData.user_uuid !== auth.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        // Application must be approved to confirm receipt
        if (applicationData.status !== "approved") {
            return NextResponse.json({ error: "Application is not approved yet" }, { status: 400 });
        }

        const listingId = applicationData.listing_id;
        const listingSnap = await getDoc(doc(firestore, "listings", listingId));

        if (!listingSnap.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        const listingData = listingSnap.data() as any;
        const { price } = listingData;
        const { days_renting } = applicationData;

        // Mark application as confirmed (item received, awaiting payment)
        await updateDoc(doc(firestore, "applications", applicationId), {
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
        });

        // Notify the owner that the renter has picked up the item
        const listingTitle = listingData.title || "Listing";
        const ownerUuid = listingData.owner_uuid;
        if (ownerUuid) {
            await notifyReceiptConfirmed(ownerUuid, listingTitle, listingId, applicationId);
        }

        // Generate Stripe payment link for the renter
        const secureString = generateSecureRandomString(32);
        await setDoc(doc(firestore, "secureStrings", secureString), {
            applicantUuid: auth.uid,
            listingId,
            applicationId,
        });

        const origin = new URL(request.url).origin;
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: listingData.title ?? "Rental Payment" },
                        unit_amount: Math.round(price.amount),
                    },
                    quantity: Math.max(1, Math.round(days_renting)),
                },
            ],
            after_completion: {
                type: "redirect",
                redirect: {
                    url: `${origin}/api/payments/success?listingId=${listingId}&applicationId=${applicationId}&token=${secureString}`,
                },
            },
            metadata: {
                listingId,
                applicationId,
                applicantUuid: auth.uid,
                secureString,
            },
        });

        return NextResponse.json({
            application_id: applicationId,
            listing_id: listingId,
            payment_link: paymentLink.url,
            message: "Receipt confirmed. Please complete the payment.",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to confirm receipt";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
