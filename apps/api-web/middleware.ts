import { NextRequest, NextResponse } from "next/server";

// The mobile app runs on its own origin (Expo dev server / native app) and calls this API
// cross-origin, so every /api/* response needs CORS headers. Auth is via Bearer token (or the
// committee portal's own-origin cookie), never cookies read cross-origin, so a permissive
// Access-Control-Allow-Origin here doesn't expose authenticated state to other sites.
export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }));
  }
  return withCors(NextResponse.next());
}

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
