import { ERROR_INVALID_REQUEST } from "@/app/lib/errors";
import { auth, firestore } from "@/app/lib/firebase_config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
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
        const data = await request.json();
        const { name, email, password, neighborhood } = data ?? {};

        if (!name || !email || !password || !neighborhood) {
            return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        const userdoc = doc(collection(firestore, "users"), credential.user.uid);
        await setDoc(userdoc, {
            name,
            email,
            neighborhood,
            uuid: credential.user.uid,
            stripe_customer_id: null,
            created_at: Timestamp.now(),
        });

        const res = NextResponse.json({
            user: {
                uid: credential.user.uid,
                email,
                name,
                neighborhood,
            },
            idToken,
        });
        setAuthCookies(res, idToken);
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to register";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
