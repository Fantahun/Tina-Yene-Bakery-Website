import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COMING_SOON_PATH = "/coming-soon";
const MAINTENANCE_PATH = "/maintenance";
const ALLOWED_PREFIXES = ["/_next", "/api", "/yeneAdmin"];

export function middleware(request: NextRequest) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const comingSoonEnabled = process.env.NEXT_PUBLIC_COMING_SOON === "true";

  if (!maintenanceEnabled && !comingSoonEnabled) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const activeModePath = maintenanceEnabled ? MAINTENANCE_PATH : COMING_SOON_PATH;

  // Keep admin, API, and technical/static paths available while public app pages are gated.
  if (
    pathname === MAINTENANCE_PATH ||
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
  rewriteUrl.pathname = activeModePath;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/:path*"],
};
