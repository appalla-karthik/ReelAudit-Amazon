import type { ComplianceViolation } from "@/lib/reelaudit-types";

type DraftOptions = {
  file: File;
  violations: ComplianceViolation[];
  onProgress?: (progress: number) => void;
};

type DraftResult = {
  blob: Blob;
  fileName: string;
  mimeType: string;
};

type MediaRecorderWithSupport = typeof MediaRecorder & {
  isTypeSupported?: (mimeType: string) => boolean;
};

type CapturableVideoElement = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const recorder = MediaRecorder as MediaRecorderWithSupport;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const candidate of candidates) {
    if (!recorder.isTypeSupported || recorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return null;
}

function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, handleResolve);
      target.removeEventListener("error", handleReject);
    };

    const handleResolve = () => {
      cleanup();
      resolve();
    };

    const handleReject = () => {
      cleanup();
      reject(new Error(`Failed while waiting for ${eventName}.`));
    };

    target.addEventListener(eventName, handleResolve, { once: true });
    target.addEventListener("error", handleReject, { once: true });
  });
}

function getActiveViolations(violations: ComplianceViolation[], currentTime: number) {
  return violations.filter(
    (violation) =>
      currentTime >= violation.start_time - 0.05 && currentTime <= violation.end_time + 0.05
  );
}

function applyBlurRegion(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  violation: ComplianceViolation
) {
  const region = violation.focusRegion;
  if (!region) {
    return;
  }

  const baseX = region.x * width;
  const baseY = region.y * height;
  const baseWidth = Math.max(24, region.width * width);
  const baseHeight = Math.max(24, region.height * height);
  const paddingX = Math.max(18, baseWidth * 0.18);
  const paddingY = Math.max(18, baseHeight * 0.18);
  const x = Math.max(0, Math.round(baseX - paddingX));
  const y = Math.max(0, Math.round(baseY - paddingY));
  const regionWidth = Math.min(width - x, Math.round(baseWidth + paddingX * 2));
  const regionHeight = Math.min(height - y, Math.round(baseHeight + paddingY * 2));

  context.save();
  context.beginPath();
  context.roundRect(x, y, regionWidth, regionHeight, 18);
  context.clip();
  context.filter = `blur(${Math.max(28, Math.round(Math.min(width, height) * 0.03))}px) saturate(0.65)`;
  context.drawImage(video, 0, 0, width, height);
  context.restore();

  context.save();
  context.fillStyle = "rgba(215, 224, 236, 0.28)";
  context.beginPath();
  context.roundRect(x, y, regionWidth, regionHeight, 18);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.32)";
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  activeViolations: ComplianceViolation[]
) {
  if (!activeViolations.length) {
    return;
  }

  const primary = activeViolations[0];
  if (["blur", "mask", "replace", "crop"].includes(primary.editPlan.strategy) && primary.focusRegion) {
    applyBlurRegion(context, video, width, height, primary);
  }
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export async function generateComplianceDraft({
  file,
  violations,
  onProgress,
}: DraftOptions): Promise<DraftResult> {
  if (typeof window === "undefined") {
    throw new Error("Auto-fix draft generation only works in the browser.");
  }

  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support MediaRecorder-based draft generation.");
  }

  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    throw new Error("This browser cannot export an edited draft video.");
  }

  const video = document.createElement("video") as CapturableVideoElement;
  video.preload = "auto";
  video.playsInline = true;
  video.volume = 0;
  video.src = URL.createObjectURL(file);

  try {
    await waitForEvent(video, "loadedmetadata");

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("The selected video could not be decoded for draft generation.");
    }

    video.muted = true;
    video.currentTime = 0;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas rendering is not available in this browser.");
    }

    const canvasStream = canvas.captureStream(24);
    const sourceStream =
      typeof video.captureStream === "function"
        ? video.captureStream()
        : typeof video.mozCaptureStream === "function"
          ? video.mozCaptureStream()
          : null;

    sourceStream?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

    const recordedChunks: BlobPart[] = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 4_500_000,
    });

    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    });

    let frameHandle = 0;

    context.drawImage(video, 0, 0, width, height);
    drawOverlay(context, video, width, height, getActiveViolations(violations, 0));
    onProgress?.(0);

    const renderFrame = () => {
      context.drawImage(video, 0, 0, width, height);
      drawOverlay(context, video, width, height, getActiveViolations(violations, video.currentTime));
      onProgress?.(Math.min(video.currentTime / video.duration, 1));

      if (!video.paused && !video.ended) {
        frameHandle = window.requestAnimationFrame(renderFrame);
      }
    };

    recorder.start(250);
    frameHandle = window.requestAnimationFrame(renderFrame);
    await video.play();
    await waitForEvent(video, "ended");

    window.cancelAnimationFrame(frameHandle);
    recorder.stop();
    await stopped;
    onProgress?.(1);

    stopStream(canvasStream);
    if (sourceStream) {
      stopStream(sourceStream);
    }

    const blob = new Blob(recordedChunks, { type: mimeType });
    const baseName = file.name.replace(/\.[^.]+$/, "") || "compliance-draft";

    return {
      blob,
      fileName: `${baseName}-market-safe.webm`,
      mimeType,
    };
  } finally {
    URL.revokeObjectURL(video.src);
    video.src = "";
  }
}
