// Handles Stripe webhook events after payment completion
import { ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { stripe } from "@/app/lib/stripe_config";
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

async function handlePaymentMetadata(metadata: Stripe.Metadata): Promise<void> {
    const listingId = metadata.listingId as string | undefined;
    const applicationId = metadata.applicationId as string | undefined;
    const applicantUuid = metadata.applicantUuid as string | undefined;
    const secureString = metadata.secureString as string | undefined;

    if (!listingId || !applicationId || !applicantUuid || !secureString) {
        return;
    }

    const secureSnap = await getDoc(doc(firestore, "secureStrings", secureString));
    if (!secureSnap.exists()) {
        return;
    }
    const secureData = secureSnap.data();
    if (!secureData) {
        return;
    }
    if (
        secureData.listingId !== listingId ||
        secureData.applicationId !== applicationId ||
        secureData.applicantUuid !== applicantUuid
    ) {
        return;
    }

    const listingSnap = await getDoc(doc(firestore, "listings", listingId));
    if (!listingSnap.exists()) {
        throw new Error(ERROR_LISTING_NOT_FOUND);
    }

    const applicationSnap = await getDoc(doc(firestore, "applications", applicationId));
    if (!applicationSnap.exists() || (applicationSnap.data() as any)?.listing_id !== listingId) {
        throw new Error(ERROR_INVALID_REQUEST);
    }

    // Update listing
    await updateDoc(doc(firestore, "listings", listingId), {
        current_tenant_uuid: applicantUuid,
        status: "rented",
        active: false,
    });

    // Approve the selected application
    await updateDoc(doc(firestore, "applications", applicationId), { status: "approved" });

    // Reject all other applications for this listing
    const relatedApplications = await getDocs(
        query(collection(firestore, "applications"), where("listing_id", "==", listingId))
    );
    await Promise.all(
        relatedApplications.docs
            .filter((d) => d.id !== applicationId)
            .map((d) => updateDoc(d.ref, { status: "rejected" }))
    );

    // Delete the secure token
    await deleteDoc(doc(firestore, "secureStrings", secureString));
}

export async function POST(request: Request): Promise<NextResponse> {
    const body = await request.text();
    const sig = (await headers()).get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return NextResponse.json({ error: "Missing webhook signature/secret" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid signature";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.metadata) {
                    await handlePaymentMetadata(session.metadata);
                }
                break;
            }
            case "payment_intent.succeeded": {
                const pi = event.data.object as Stripe.PaymentIntent;
                if (pi.metadata) {
                    await handlePaymentMetadata(pi.metadata);
                }
                break;
            }
            default:
                break;
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Webhook processing failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
