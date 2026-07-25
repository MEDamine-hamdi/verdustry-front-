import { auth } from "@/auth";
import { canAccessRoute, DEFAULT_ROUTE } from "@/lib/roles";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isPublic =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublic) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
      const target = role ? DEFAULT_ROUTE[role] : "/login";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/dashboard") {
    const target = role ? DEFAULT_ROUTE[role] : "/login";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (role && !canAccessRoute(role, pathname)) {
    const target = DEFAULT_ROUTE[role];
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};