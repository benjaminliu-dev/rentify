import { ERROR_ACCESS_DENIED, ERROR_INVALID_REQUEST, ERROR_LISTING_NOT_FOUND } from "@/app/lib/errors";
import { auth, firestore } from "@/app/lib/firebase_config";
import { signInWithCustomToken } from "firebase/auth";
import { stripe } from "@/app/lib/stripe_config";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import * as crypto from 'crypto';

function generateSecureRandomString(length: number): string {
    const bytes = crypto.randomBytes(Math.ceil(length / 2));
    return bytes.toString('hex').slice(0, length);
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const idToken = request.headers.get("Id-Token");
        if (!idToken) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const credential = await signInWithCustomToken(auth, idToken);
        if (!credential?.user) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 401 });
        }

        const { listingId, applicationId } = await request.json();

        if (!listingId || !applicationId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const listingRef = doc(firestore, "listings", listingId);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
            return NextResponse.json({ error: ERROR_LISTING_NOT_FOUND }, { status: 404 });
        }

        if (listingSnap.data().owner_uuid !== credential.user.uid) {
            return NextResponse.json({ error: ERROR_ACCESS_DENIED }, { status: 403 });
        }

        const applicationRef = doc(firestore, "applications", applicationId);
        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists() || applicationSnap.data().listing_id !== listingId) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const listingData = listingSnap.data();
        const applicationData = applicationSnap.data();

        const { price } = listingData;
        const { days_renting } = applicationData;

        if (
            !price ||
            typeof price.amount !== "number" ||
            !price.unit ||
            typeof days_renting !== "number" ||
            days_renting <= 0
        ) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const approvedApplicantUuid = applicationData.user_uuid;

        const secureString = generateSecureRandomString(32);
        // Store a one-time token to validate the payment success callback.
        await setDoc(doc(collection(firestore, "secureStrings"), secureString), {
            applicantUuid: approvedApplicantUuid,
            listingId,
            applicationId,
        });

        const origin = new URL(request.url).origin;
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: String(price.unit).toLowerCase(),
                        product_data: { name: listingData.title ?? "Rental Payment" },
                        unit_amount: Math.round(price.amount * 100),
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
                applicantUuid: approvedApplicantUuid,
                secureString,
            },
        });

        return NextResponse.json({
            approved_application_id: applicationId,
            listing_id: listingId,
            payment_link: paymentLink.url,
            // NOTE: Status updates now handled in /api/payments/success after payment completion.
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to approve application";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
