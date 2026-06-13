import { NextRequest, NextResponse } from "next/server";
import { safeEmailConfigDiagnostics } from "@/lib/email/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return Boolean(cronSecret && (bearer === cronSecret || querySecret === cronSecret));
}

export function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(safeEmailConfigDiagnostics(process.env));
}
