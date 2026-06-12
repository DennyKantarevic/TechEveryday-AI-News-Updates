import { NextRequest, NextResponse } from "next/server";
import { fileStorage } from "@/lib/storage";
import type { NewsItem } from "@/types/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gallery = await fileStorage.readGallery();
  return NextResponse.json({ items: gallery });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { item?: NewsItem };

  if (!body.item?.id) {
    return NextResponse.json({ error: "A valid item is required." }, { status: 400 });
  }

  const savedItem = await fileStorage.saveGalleryItem(body.item);
  return NextResponse.json({ item: savedItem });
}

export async function DELETE(request: NextRequest) {
  let id = request.nextUrl.searchParams.get("id");

  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = body.id ?? null;
    } catch {
      id = null;
    }
  }

  if (!id) {
    return NextResponse.json({ error: "An item id is required." }, { status: 400 });
  }

  const items = await fileStorage.removeGalleryItem(id);
  return NextResponse.json({ items });
}
