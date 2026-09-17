import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to safely parse JWT payload at the edge
function parseJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. BLOCK DIRECT ACCESS TO PRIVATE STATIC CONTENT (Videos & Documents)
  // Direct scraping of /uploads/videos/* and /uploads/documents/* is strictly forbidden.
  // Content MUST only be accessed through the authorized APIs: /api/video/stream and /api/document/download
  if (
    pathname.startsWith("/uploads/videos/") ||
    pathname.startsWith("/uploads/documents/")
  ) {
    return new NextResponse(
      JSON.stringify({
        error: "Access Denied: Protected educational content must be accessed via authorized platform players.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. EDGE ROUTE GUARDS FOR ADMIN & STUDENT PORTALS
  const token = request.cookies.get("auth_token")?.value;
  const payload = token ? parseJwtPayload(token) : null;
  const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : true;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!token || !payload || isExpired) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (payload.role !== "ADMIN") {
      // Non-admin trying to access admin portal
      return NextResponse.redirect(new URL("/student", request.url));
    }
  }

  // Protect /student routes
  if (pathname.startsWith("/student")) {
    if (!token || !payload || isExpired) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. APPLY SECURITY HEADERS (Defensive in Depth)
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/uploads/videos/:path*",
    "/uploads/documents/:path*",
  ],
};