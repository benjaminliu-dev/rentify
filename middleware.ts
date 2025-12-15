import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only apply to API routes via matcher below.
  const idToken =
    request.headers.get("Id-Token") ||
    request.cookies.get("idToken")?.value ||
    request.cookies.get("id_token")?.value;

  if (!idToken) return NextResponse.next();

  // Ensure every API request has Id-Token header (even if client forgets).
  const headers = new Headers(request.headers);
  headers.set("Id-Token", idToken);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};


