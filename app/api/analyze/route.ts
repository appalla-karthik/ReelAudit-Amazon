import { NextResponse } from "next/server";

import { analyzeVideoCompliance, validateUpload } from "@/lib/reelaudit-server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video");
    const rawMarkets = formData.get("markets");
    const rawDurationSeconds = formData.get("durationSeconds");

    if (!(videoFile instanceof File)) {
      return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    }

    const selectedMarkets =
      typeof rawMarkets === "string"
        ? ((JSON.parse(rawMarkets) as string[]).filter(Boolean) ?? [])
        : [];

    if (!selectedMarkets.length) {
      return NextResponse.json({ error: "Select at least one market." }, { status: 400 });
    }

    validateUpload(videoFile.size);

    const bytes = new Uint8Array(await videoFile.arrayBuffer());
    const analysis = await analyzeVideoCompliance({
      bytes,
      contentType: videoFile.type || "video/mp4",
      fileName: videoFile.name || "upload.mp4",
      selectedMarkets,
      durationSeconds:
        typeof rawDurationSeconds === "string" && Number.isFinite(Number(rawDurationSeconds))
          ? Number(rawDurationSeconds)
          : null,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We couldn't complete the Bedrock analysis.";
    const status = /required|select|missing|supports uploads/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
