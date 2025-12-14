// not sure what this needs to do; /success seems to work fine without it
// but let's keep it for now in case we need it later
// i'm so tired
import { ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { firestore } from "@/app/lib/firebase_config";
import { stripe } from "@/app/lib/stripe_config";
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
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

    const secureRef = doc(firestore, "secureStrings", secureString);
    const secureSnap = await getDoc(secureRef);
    if (!secureSnap.exists()) {
        return;
    }
    const secureData = secureSnap.data();
    if (
        secureData.listingId !== listingId ||
        secureData.applicationId !== applicationId ||
        secureData.applicantUuid !== applicantUuid
    ) {
        return;
    }

    const listingRef = doc(firestore, "listings", listingId);
    const listingSnap = await getDoc(listingRef);
    if (!listingSnap.exists()) {
        throw new Error(ERROR_LISTING_NOT_FOUND);
    }

    const applicationRef = doc(firestore, "applications", applicationId);
    const applicationSnap = await getDoc(applicationRef);
    if (!applicationSnap.exists() || applicationSnap.data().listing_id !== listingId) {
        throw new Error(ERROR_INVALID_REQUEST);
    }

    const batch = writeBatch(firestore);

    batch.update(listingRef, {
        current_tenant_uuid: applicantUuid,
        status: "rented",
        active: false,
    });

    batch.update(applicationRef, { status: "approved" });

    const applicationsRef = collection(firestore, "applications");
    const relatedApplications = await getDocs(query(applicationsRef, where("listing_id", "==", listingId)));
    relatedApplications.docs.forEach((docSnap) => {
        if (docSnap.id !== applicationId) {
            batch.update(docSnap.ref, { status: "rejected" });
        }
    });

    batch.delete(secureRef);
    await batch.commit();
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
