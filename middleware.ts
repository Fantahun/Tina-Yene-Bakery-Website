import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COMING_SOON_PATH = "/coming-soon";
const ALLOWED_PREFIXES = ["/_next", "/api", "/yeneAdmin"];

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_COMING_SOON !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Keep admin, API, and technical/static paths available while app pages show coming soon.
  if (
    pathname === COMING_SOON_PATH ||
    ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.match(/\.[a-zA-Z0-9]+$/)
  ) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = COMING_SOON_PATH;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/:path*"],
};
