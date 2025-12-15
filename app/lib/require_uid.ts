import { ERROR_ACCESS_DENIED } from "@/app/lib/errors";

function getCookieValue(cookieHeader: string, key: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(part.slice(0, idx).trim());
    if (k !== key) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function decodeBase64Url(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function decodeFirebaseIdTokenUid(idToken: string): string | null {
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as { user_id?: unknown; sub?: unknown; exp?: unknown; uid?: unknown };
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (exp && exp * 1000 < Date.now()) return null;
    const uid =
      (typeof payload.user_id === "string" && payload.user_id) ||
      (typeof payload.sub === "string" && payload.sub) ||
      (typeof payload.uid === "string" && payload.uid) ||
      null;
    return uid;
  } catch {
    return null;
  }
}

export async function requireUidFromRequest(request: Request): Promise<
  | { ok: true; uid: string }
  | { ok: false; status: 401; error: string }
> {
  const headerToken = request.headers.get("Id-Token");
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieToken = getCookieValue(cookieHeader, "idToken") || getCookieValue(cookieHeader, "id_token");
  const idToken = headerToken || cookieToken;
  if (!idToken) return { ok: false, status: 401, error: ERROR_ACCESS_DENIED };

  // NOTE: This decodes the Firebase ID token to extract UID and checks expiry.
  // It does NOT verify the signature. For production security, replace with Firebase Admin verifyIdToken.
  const uid = decodeFirebaseIdTokenUid(idToken);
  if (!uid) return { ok: false, status: 401, error: ERROR_ACCESS_DENIED };
  return { ok: true, uid };
}


