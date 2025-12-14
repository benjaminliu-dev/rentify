import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
    // Actual state updates happen in /api/payments/webhook after Stripe confirms payment.
    return NextResponse.redirect(new URL("/home", request.url));
}
