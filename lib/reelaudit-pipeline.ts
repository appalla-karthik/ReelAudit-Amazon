import type { AnalysisChunk, AnalysisScope } from "@/lib/reelaudit-types";

export const LONGFORM_THRESHOLD_SECONDS = 5 * 60;
export const DEFAULT_CHUNK_WINDOW_SECONDS = 45;
export const DEFAULT_CHUNK_OVERLAP_SECONDS = 3;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function roundHalf(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 2) / 2;
}

export function createChunkPlan(durationSeconds?: number | null): {
  scope: AnalysisScope;
  chunks: AnalysisChunk[];
} {
  const safeDuration = roundHalf(durationSeconds ?? 0);

  if (!safeDuration) {
    return {
      scope: {
        processingMode: "single-pass",
        estimatedChunks: 1,
        chunkWindowSeconds: DEFAULT_CHUNK_WINDOW_SECONDS,
        durationSeconds: null,
      },
      chunks: [],
    };
  }

  if (safeDuration <= LONGFORM_THRESHOLD_SECONDS) {
    return {
      scope: {
        processingMode: "single-pass",
        estimatedChunks: 1,
        chunkWindowSeconds: DEFAULT_CHUNK_WINDOW_SECONDS,
        durationSeconds: safeDuration,
      },
      chunks: [
        {
          id: "chunk-1",
          start_time: 0,
          end_time: safeDuration,
          display_time: `00:00 - ${formatTime(safeDuration)}`,
          label: "Full clip",
          status: "planned",
        },
      ],
    };
  }

  const chunks: AnalysisChunk[] = [];
  let start = 0;
  let index = 1;

  while (start < safeDuration) {
    const end = Math.min(start + DEFAULT_CHUNK_WINDOW_SECONDS, safeDuration);
    chunks.push({
      id: `chunk-${index}`,
      start_time: roundHalf(start),
      end_time: roundHalf(end),
      display_time: `${formatTime(start)} - ${formatTime(end)}`,
      label: `Chunk ${index}`,
      status: "planned",
    });

    if (end >= safeDuration) {
      break;
    }

    start = Math.max(0, end - DEFAULT_CHUNK_OVERLAP_SECONDS);
    index += 1;
  }

  return {
    scope: {
      processingMode: "chunked-longform",
      estimatedChunks: chunks.length,
      chunkWindowSeconds: DEFAULT_CHUNK_WINDOW_SECONDS,
      durationSeconds: safeDuration,
    },
    chunks,
  };
}
