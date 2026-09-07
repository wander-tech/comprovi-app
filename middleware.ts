import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const STATIC_ASSET_EXTENSION = /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_ASSET_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("accessToken")?.value;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublic) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
