export function getIdTokenFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("idToken") || localStorage.getItem("id_token");
  } catch {
    return null;
  }
}

export function getIdTokenFromCookies(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = document.cookie || "";
    const parts = raw.split(";").map((p) => p.trim());
    const map = new Map<string, string>();
    for (const p of parts) {
      if (!p) continue;
      const idx = p.indexOf("=");
      if (idx === -1) continue;
      const k = decodeURIComponent(p.slice(0, idx).trim());
      const v = decodeURIComponent(p.slice(idx + 1).trim());
      map.set(k, v);
    }
    return map.get("idToken") || map.get("id_token") || null;
  } catch {
    return null;
  }
}

export function getIdToken(): string | null {
  return getIdTokenFromCookies() || getIdTokenFromLocalStorage();
}

export function setIdTokenCookie(token: string) {
  if (typeof window === "undefined") return;
  const safe = encodeURIComponent(token);
  const secure = window.location?.protocol === "https:" ? "; Secure" : "";
  // 7 days
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `idToken=${safe}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  document.cookie = `id_token=${safe}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function withIdTokenHeader(
  init?: RequestInit,
  token: string | null = getIdToken()
): RequestInit {
  const headers = new Headers(init?.headers ?? undefined);
  if (token) headers.set("Id-Token", token);
  return { ...init, headers };
}


