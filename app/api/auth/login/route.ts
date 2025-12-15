import { ERROR_INVALID_REQUEST } from "@/app/lib/errors";
import { auth } from "@/app/lib/firebase_config";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { NextResponse } from "next/server";

function setAuthCookies(res: NextResponse, idToken: string) {
    // 7 days
    const maxAge = 60 * 60 * 24 * 7;
    // Note: httpOnly removed so client JavaScript can read the cookie for auth headers
    res.cookies.set("idToken", idToken, { sameSite: "lax", path: "/", maxAge });
    res.cookies.set("id_token", idToken, { sameSite: "lax", path: "/", maxAge });
}


export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { email, password, id } = await request.json();

        if (id) {
            const credential = await signInWithCustomToken(auth, id);
            const idToken = await credential.user.getIdToken();
            const res = NextResponse.json({
                user: {
                    uid: credential.user.uid,
                    email: credential.user.email,
                },
                idToken,
            });
            setAuthCookies(res, idToken);
            return res;
        }

        if (email && password) {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await credential.user.getIdToken();
            const res = NextResponse.json({
                user: {
                    uid: credential.user.uid,
                    email: credential.user.email,
                },
                idToken,
            });
            setAuthCookies(res, idToken);
            return res;
        }

        return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to sign in";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
