import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized();
  return ok({ user: session });
}
