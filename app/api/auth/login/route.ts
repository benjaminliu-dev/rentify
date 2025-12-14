import { ERROR_INVALID_REQUEST } from "@/app/lib/errors";
import { auth } from "@/app/lib/firebase_config";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { NextResponse } from "next/server";


export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { email, password, id } = await request.json();

        if (id) {
            const credential = await signInWithCustomToken(auth, id);
            const idToken = await credential.user.getIdToken();
            return NextResponse.json({
                user: {
                    uid: credential.user.uid,
                    email: credential.user.email,
                },
                idToken,
            });
        }

        if (email && password) {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await credential.user.getIdToken();
            return NextResponse.json({
                user: {
                    uid: credential.user.uid,
                    email: credential.user.email,
                },
                idToken,
            });
        }

        return NextResponse.json({ error: ERROR_INVALID_REQUEST }, { status: 400 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to sign in";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
