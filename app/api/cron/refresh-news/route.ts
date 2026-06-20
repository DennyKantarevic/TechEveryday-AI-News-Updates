import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { handleRefreshRequest } from "@/lib/news/refreshHandler";
import { getRefreshCronDecision } from "@/lib/news/refreshSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Vercel Cron sends GET requests with user-agent vercel-cron/1.0.
  void getRefreshCronDecision;
  const force = request.nextUrl.searchParams.get("force") === "true";

  return handleRefreshRequest(request, {
    scheduled: !force,
    allowVercelCron: true,
    revalidate: (path) => {
      if (path === "/") {
        revalidatePath("/");
        return;
      }

      revalidatePath(path);
    }
  });
}
