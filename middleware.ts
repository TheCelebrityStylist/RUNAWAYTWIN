import { NextResponse, type NextRequest } from "next/server";

// Case-sensitive legacy redirect: the old Base44 "/Blog" page. (next.config redirects match case-insensitively.)
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/Blog") {
    const url = req.nextUrl.clone();
    url.pathname = "/blog";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/Blog"] };
