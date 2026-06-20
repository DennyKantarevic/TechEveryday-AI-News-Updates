import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { handleRefreshRequest } from "@/lib/news/refreshHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isScheduledCompatibilityRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get("scheduled") === "1";
}

export async function GET(request: NextRequest) {
  return handleRefreshRequest(request, {
    scheduled: isScheduledCompatibilityRequest(request),
    allowVercelCron: false,
    revalidate: (path) => revalidatePath(path)
  });
}

export async function POST(request: NextRequest) {
  return handleRefreshRequest(request, {
    scheduled: isScheduledCompatibilityRequest(request),
    allowVercelCron: false,
    revalidate: (path) => revalidatePath(path)
  });
}
