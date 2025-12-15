import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
    const res = NextResponse.json({ success: true });

    // Clear auth cookies
    res.cookies.set("idToken", "", { maxAge: 0, path: "/" });
    res.cookies.set("id_token", "", { maxAge: 0, path: "/" });

    return res;
}

export async function GET(): Promise<NextResponse> {
    const res = NextResponse.redirect(new URL("/login", "http://localhost:3000"));

    // Clear auth cookies
    res.cookies.set("idToken", "", { maxAge: 0, path: "/" });
    res.cookies.set("id_token", "", { maxAge: 0, path: "/" });

    return res;
}

