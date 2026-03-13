"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Timer,
  Wand2,
} from "lucide-react";

import { generateComplianceDraft } from "@/lib/reelaudit-autofix";
import { createChunkPlan } from "@/lib/reelaudit-pipeline";
import type { ComplianceAnalysisResponse, ComplianceViolation } from "@/lib/reelaudit-types";

type ViewState = "upload" | "processing" | "review";

const MARKETS = ["UAE", "Germany", "USA", "India", "South Korea", "Brazil"];

const PROCESSING_STEPS = [
  "Uploading secure review copy to S3...",
  "Scanning frames and visible on-screen text...",
  "Comparing scenes against selected market rules...",
  "Normalizing findings for timeline review...",
];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const modalityStyles: Record<ComplianceViolation["modality"], string> = {
  Visual: "bg-rose-100 text-rose-700",
  Audio: "bg-amber-100 text-amber-700",
  "Cross-Modal": "bg-indigo-100 text-indigo-700",
};

const strategyLabels: Record<ComplianceViolation["editPlan"]["strategy"], string> = {
  blur: "Blur",
  mask: "Mask",
  crop: "Crop",
  replace: "Replace",
  disclaimer: "Disclaimer",
  mute: "Mute",
  trim: "Trim",
  "manual-review": "Manual review",
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const getAspectRatio = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
};

async function getResponseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "We couldn't complete the Nova analysis.";
  } catch {
    return "We couldn't complete the Nova analysis.";
  }
}

export default function DashboardPage() {
  const [view, setView] = useState<ViewState>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([
    "UAE",
    "Germany",
    "USA",
  ]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sourceDuration, setSourceDuration] = useState<number | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ComplianceAnalysisResponse | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState(0);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [previewMode, setPreviewMode] = useState<"original" | "draft">("original");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setVideoUrl(null);
      setSourceDuration(null);
      setVideoAspectRatio(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const probe = document.createElement("video");
    probe.preload = "metadata";

    const handleLoadedMetadata = () => {
      setSourceDuration(Number.isFinite(probe.duration) ? probe.duration : null);
      setVideoAspectRatio(getAspectRatio(probe.videoWidth, probe.videoHeight));
    };

    const handleMetadataError = () => {
      setSourceDuration(null);
      setVideoAspectRatio(null);
    };

    probe.addEventListener("loadedmetadata", handleLoadedMetadata);
    probe.addEventListener("error", handleMetadataError);
    probe.src = url;

    return () => {
      probe.removeEventListener("loadedmetadata", handleLoadedMetadata);
      probe.removeEventListener("error", handleMetadataError);
      probe.src = "";
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (draftUrl) {
        URL.revokeObjectURL(draftUrl);
      }
    };
  }, [draftUrl]);

  useEffect(() => {
    if (view !== "processing" || !isAnalyzing) return;

    setPhaseIndex(0);
    const stepInterval = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 1100);

    return () => {
      clearInterval(stepInterval);
    };
  }, [view, isAnalyzing]);

  const visibleViolations = useMemo(
    () => (analysis?.violations ?? []).filter((violation) => selectedMarkets.includes(violation.market)),
    [analysis, selectedMarkets]
  );

  useEffect(() => {
    if (view !== "review") return;

    setActiveViolationId((prev) =>
      visibleViolations.some((violation) => violation.id === prev)
        ? prev
        : (visibleViolations[0]?.id ?? null)
    );
  }, [view, visibleViolations]);

  const complianceScore = analysis?.complianceScore ?? 0;
  const timelineDuration =
    duration || sourceDuration || Math.max(120, ...visibleViolations.map((violation) => violation.end_time));
  const canAnalyze = Boolean(file) && selectedMarkets.length > 0 && !isAnalyzing;
  const processingProgress = Math.min(28 + phaseIndex * 22, 94);
  const uploadPlan = useMemo(() => createChunkPlan(sourceDuration), [sourceDuration]);
  const currentScope = analysis?.scope ?? uploadPlan.scope;
  const currentChunks = analysis?.chunks ?? uploadPlan.chunks;
  const canGenerateDraft = Boolean(file) && visibleViolations.length > 0 && !isGeneratingDraft;
  const activeVideoUrl = previewMode === "draft" && draftUrl ? draftUrl : videoUrl;
  const previewFrameStyle = useMemo<CSSProperties>(() => {
    const ratio = videoAspectRatio ?? 16 / 9;

    if (ratio < 0.9) {
      return {
        aspectRatio: `${ratio}`,
        width: "min(100%, 420px)",
      };
    }

    if (ratio < 1.3) {
      return {
        aspectRatio: `${ratio}`,
        width: "min(100%, 640px)",
      };
    }

    return {
      aspectRatio: `${ratio}`,
      width: "100%",
    };
  }, [videoAspectRatio]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
  }, [activeVideoUrl]);

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;

    if (draftUrl) {
      URL.revokeObjectURL(draftUrl);
    }
    setAnalysis(null);
    setAnalysisError(null);
    setDraftError(null);
    setDraftUrl(null);
    setDraftFileName(null);
    setDraftProgress(0);
    setPreviewMode("original");
    setActiveViolationId(null);
    setDuration(0);
    setSourceDuration(null);
    setVideoAspectRatio(null);
    setFile(nextFile);
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || !file) return;

    setAnalysis(null);
    setAnalysisError(null);
    setDraftError(null);
    setActiveViolationId(null);
    setIsAnalyzing(true);
    setView("processing");

    const formData = new FormData();
    formData.append("video", file);
    formData.append("markets", JSON.stringify(selectedMarkets));
    if (sourceDuration) {
      formData.append("durationSeconds", String(sourceDuration));
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const payload = (await response.json()) as ComplianceAnalysisResponse;
      setAnalysis(payload);
      setDraftError(null);
      setPreviewMode("original");
      setView("review");
    } catch (error) {
      setView("upload");
      setAnalysisError(
        error instanceof Error ? error.message : "We couldn't complete the Nova analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViolationClick = (violation: ComplianceViolation) => {
    setActiveViolationId(violation.id);
    if (videoRef.current) {
      videoRef.current.currentTime = violation.start_time;
      const playAttempt = videoRef.current.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => undefined);
      }
    }
  };

  const handleGenerateDraft = async () => {
    if (!file || !visibleViolations.length || isGeneratingDraft) return;

    if (draftUrl) {
      URL.revokeObjectURL(draftUrl);
    }

    setDraftError(null);
    setDraftUrl(null);
    setDraftFileName(null);
    setDraftProgress(0);
    setIsGeneratingDraft(true);

    try {
      const result = await generateComplianceDraft({
        file,
        violations: visibleViolations,
        onProgress: (progress) => setDraftProgress(Math.round(progress * 100)),
      });

      const nextDraftUrl = URL.createObjectURL(result.blob);
      setDraftUrl(nextDraftUrl);
      setDraftFileName(result.fileName);
      setPreviewMode("draft");
    } catch (error) {
      setDraftError(
        error instanceof Error
          ? error.message
          : "We couldn't generate the market-safe draft."
      );
      setPreviewMode("original");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleReset = () => {
    if (draftUrl) {
      URL.revokeObjectURL(draftUrl);
    }
    setView("upload");
    setFile(null);
    setAnalysis(null);
    setAnalysisError(null);
    setDraftError(null);
    setDraftUrl(null);
    setDraftFileName(null);
    setDraftProgress(0);
    setPreviewMode("original");
    setDuration(0);
    setSourceDuration(null);
    setVideoAspectRatio(null);
    setActiveViolationId(null);
    setDropdownOpen(false);
    setIsAnalyzing(false);
  };

  const toggleMarket = (market: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(market) ? prev.filter((item) => item !== market) : [...prev, market]
    );
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F5F7FB]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-10%] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#e7ecff,transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F3CFF] text-white shadow-[0_15px_35px_-25px_rgba(47,60,255,0.8)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2F3CFF]">Reel Audit</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Global AI Video Compliance Engine
              </h1>
              <p className="text-sm text-slate-500">
                Command Center - Amazon Nova + S3 review workflow
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-[#2F3CFF]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </Link>
            {view === "review" ? (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-[#2F3CFF]"
              >
                New Upload
              </button>
            ) : (
              <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm">
                Live Bedrock + S3 mode
              </div>
            )}
          </div>
        </header>

        {analysisError && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Analysis could not finish</p>
                <p className="mt-1 text-rose-600">{analysisError}</p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === "upload" && (
            <motion.section
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="rounded-[32px] bg-gradient-to-br from-indigo-200/60 via-white to-emerald-100/70 p-[1px] shadow-[0_20px_60px_-45px_rgba(15,23,42,0.6)]">
                <div className="rounded-[31px] bg-white/90 p-8 backdrop-blur">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      handleFile(event.dataTransfer.files?.[0] ?? null);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition ${
                      isDragging
                        ? "border-[#2F3CFF] bg-indigo-50"
                        : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50"
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2F3CFF] shadow-sm">
                      <CloudUpload className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Drag and drop your video asset
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Upload a local video and Reel Audit will send it to S3, then run Amazon Nova
                        across the markets you select.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-[#2F3CFF] px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_35px_-25px_rgba(47,60,255,0.8)] transition hover:bg-[#3c48ff]"
                    >
                      Browse files
                    </button>
                    <p className="text-xs text-slate-400">
                      MP4, MOV, WEBM up to 100 MB in the live API flow
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="video/*"
                      onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-6 flex min-w-0 items-center justify-between gap-3 text-sm text-slate-500">
                    <span className="min-w-0 flex-1 truncate">
                      {file ? file.name : "No file selected yet"}
                    </span>
                    <span className="shrink-0">
                      {file ? formatFileSize(file.size) : "Awaiting upload"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="relative z-40 rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0ff] text-[#2F3CFF]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Target Markets</p>
                      <p className="text-xs text-slate-500">
                        Choose jurisdictions for the live compliance pass.
                      </p>
                    </div>
                  </div>
                  <div className="relative z-30 mt-4">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200"
                    >
                      <span>{selectedMarkets.length} markets selected</span>
                      <ChevronDown
                        className={`h-4 w-4 transition ${
                          dropdownOpen ? "rotate-180 text-[#2F3CFF]" : "text-slate-400"
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
                        >
                          <div className="grid gap-2">
                            {MARKETS.map((market) => (
                              <label
                                key={market}
                                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-slate-50"
                              >
                                <span className="text-slate-700">{market}</span>
                                <input
                                  type="checkbox"
                                  checked={selectedMarkets.includes(market)}
                                  onChange={() => toggleMarket(market)}
                                  className="h-4 w-4 accent-[#2F3CFF]"
                                />
                              </label>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedMarkets.map((market) => (
                      <span
                        key={market}
                        className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-semibold text-[#2F3CFF]"
                      >
                        {market}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Timer className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Amazon Nova Pipeline</p>
                      <p className="text-xs text-slate-500">
                        Live S3 upload plus market-by-market visual review in Bedrock.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">Live</p>
                      <p>S3-backed upload flow</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">Video + Text</p>
                      <p>Frames and visible copy</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">{selectedMarkets.length} regions</p>
                      <p>Rulesets loaded on request</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">
                        {currentScope.processingMode === "chunked-longform"
                          ? `${currentScope.estimatedChunks} planned chunks`
                          : "Single clip pass"}
                      </p>
                      <p>
                        {sourceDuration
                          ? `${formatTime(sourceDuration)} duration detected`
                          : "Chunk plan appears after metadata loads"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    Audio-only violations are intentionally disabled in this first live integration.
                    Long-form production mode will split hours-long masters into overlap-safe chunk windows.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAnalyze}
                  onClick={handleAnalyze}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold shadow-[0_18px_45px_-32px_rgba(47,60,255,0.9)] transition ${
                    canAnalyze
                      ? "bg-[#2F3CFF] text-white hover:bg-[#3c48ff]"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? "Analyzing..." : "Analyze Compliance"}
                </button>
              </div>
            </motion.section>
          )}

          {view === "processing" && (
            <motion.section
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="flex min-h-[70vh] items-center justify-center"
            >
              <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white/90 p-10 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.6)] backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#2F3CFF]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Amazon Nova is processing your video
                    </p>
                    <p className="text-xs text-slate-500">
                      Bedrock is reviewing {selectedMarkets.length} selected markets now.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={phaseIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="text-lg font-semibold text-slate-900"
                    >
                      {PROCESSING_STEPS[phaseIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    animate={{ width: `${processingProgress}%` }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                    className="h-full rounded-full bg-[#2F3CFF]"
                  />
                </div>

                <div className="mt-6 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                  {PROCESSING_STEPS.map((step, index) => (
                    <div
                      key={step}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                        index <= phaseIndex
                          ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <span className="flex h-2 w-2 rounded-full bg-current" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {view === "review" && analysis && (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Compliance Score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{complianceScore}%</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Across {analysis.selectedMarkets.length} markets
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Violations Detected
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-rose-600">
                    {visibleViolations.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Normalized from the Nova response
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Review Status
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-lg font-semibold">
                      {visibleViolations.length > 0 ? "Review recommended" : "Clear on selected rules"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{analysis.summary}</p>
                </div>
              </div>

              {analysis.warnings.length > 0 && (
                <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      {analysis.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Auto-Fix Draft
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      Generate a market-safe preview automatically
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      First version applies non-destructive disclaimer overlays on flagged
                      timestamps so the scene can stay intact while your team reviews the edit plan.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!canGenerateDraft}
                      onClick={handleGenerateDraft}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        canGenerateDraft
                          ? "bg-[#2F3CFF] text-white hover:bg-[#3c48ff]"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                      }`}
                    >
                      <Wand2 className="h-4 w-4" />
                      {isGeneratingDraft ? `Generating ${draftProgress}%` : "Create Safe Draft"}
                    </button>
                    {draftUrl && draftFileName && (
                      <a
                        href={draftUrl}
                        download={draftFileName}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-[#2F3CFF]"
                      >
                        <Download className="h-4 w-4" />
                        Download Draft
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-900">Current fix mode</p>
                    <p className="mt-1">Disclaimer overlay on each flagged time window</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-900">Scene handling</p>
                    <p className="mt-1">Keeps the scene intact instead of cutting it immediately</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-900">Next upgrade</p>
                    <p className="mt-1">Blur, mask, and market-specific export jobs for long-form</p>
                  </div>
                </div>

                {draftError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {draftError}
                  </div>
                )}

                {draftUrl && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("original")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        previewMode === "original"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Original preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("draft")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        previewMode === "draft"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      Safe draft preview
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Processing Mode
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {analysis.scope.processingMode === "chunked-longform"
                      ? "Chunked long-form plan"
                      : "Single-pass clip review"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {analysis.scope.estimatedChunks} chunk windows · {analysis.scope.chunkWindowSeconds}s each
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    This is the path we use to scale from short clips today to hour-long masters in
                    production without losing where the violation happened.
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Chunk Plan
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        The same video can be expanded into chunk-level analysis for long-form review.
                      </p>
                    </div>
                    <div className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-semibold text-[#2F3CFF]">
                      {analysis.chunks.length} chunks
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {currentChunks.slice(0, 6).map((chunk) => (
                      <div
                        key={chunk.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-500"
                      >
                        <p className="font-semibold text-slate-900">{chunk.label}</p>
                        <p className="mt-1">{chunk.display_time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.6)] backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Media Viewer</h2>
                      <p className="text-xs text-slate-500">
                        Click a violation to seek and review instantly.
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Compliance Timeline
                    </div>
                  </div>

                  {draftUrl && (
                    <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      Preview: {previewMode === "draft" ? "Safe draft" : "Original upload"}
                    </div>
                  )}

                  <div
                    className="mt-5 mx-auto overflow-hidden rounded-2xl bg-slate-900"
                    style={previewFrameStyle}
                  >
                    {activeVideoUrl ? (
                      <video
                        ref={videoRef}
                        src={activeVideoUrl}
                        controls
                        className="h-full w-full object-contain"
                        onLoadedMetadata={(event) => {
                          setDuration(event.currentTarget.duration);
                          setVideoAspectRatio(
                            getAspectRatio(
                              event.currentTarget.videoWidth,
                              event.currentTarget.videoHeight
                            )
                          );
                        }}
                        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                        <PlayCircle className="h-12 w-12" />
                        <p className="text-sm">Upload a video to preview here</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Compliance timeline</span>
                      <span>{formatTime(timelineDuration)}</span>
                    </div>
                    <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-300 opacity-70" />
                      {visibleViolations.map((violation) => {
                        const position = Math.min(
                          (violation.start_time / timelineDuration) * 100,
                          98
                        );
                        const isActive = activeViolationId === violation.id;
                        return (
                          <button
                            key={violation.id}
                            type="button"
                            title={`${violation.market} - ${violation.issue}`}
                            onClick={() => handleViolationClick(violation)}
                            className={`absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full transition ${
                              isActive
                                ? "bg-rose-500 shadow-md ring-2 ring-rose-200"
                                : "bg-rose-300 hover:bg-rose-400"
                            }`}
                            style={{ left: `${position}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>00:00</span>
                      <span>{formatTime(timelineDuration)}</span>
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    <summary className="cursor-pointer list-none font-semibold text-slate-500 marker:hidden">
                      Technical details
                    </summary>
                    <div className="mt-3 grid gap-2 text-[11px] leading-relaxed text-slate-500">
                      <div>
                        <span className="font-semibold text-slate-600">Model:</span> {analysis.modelId}
                      </div>
                      <div className="break-all">
                        <span className="font-semibold text-slate-600">S3 source:</span> {analysis.s3Uri}
                      </div>
                    </div>
                  </details>
                </div>

                <div className="flex flex-col rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.6)] backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Violation Inbox</h2>
                      <p className="text-xs text-slate-500">
                        {visibleViolations.length} flagged moments requiring edits.
                      </p>
                    </div>
                    <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      {visibleViolations.length} flags
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    {visibleViolations.map((violation) => {
                      const isActive = activeViolationId === violation.id;
                      return (
                        <motion.button
                          key={violation.id}
                          type="button"
                          onClick={() => handleViolationClick(violation)}
                          whileHover={{ y: -2 }}
                          className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                            isActive
                              ? "border-indigo-300 bg-indigo-50/50"
                              : "border-slate-200 bg-white hover:border-indigo-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[#2F3CFF]">
                              {violation.market}
                            </span>
                            <span className="text-xs text-slate-500">
                              {violation.display_time} - {formatTime(violation.end_time)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                modalityStyles[violation.modality]
                              }`}
                            >
                              {violation.modality}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-rose-500">
                              <AlertTriangle className="h-3 w-3" />
                              {Math.round(violation.confidence * 100)}% confidence
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {strategyLabels[violation.editPlan.strategy]}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {violation.editPlan.preserveScene ? "Preserve scene" : "Regional cut"}
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {violation.ruleFocus}
                          </p>
                          <p className="mt-3 text-sm text-slate-700">{violation.issue}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Suggested action: {violation.suggestion}
                          </p>
                          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-900">Fix plan:</span>{" "}
                              {violation.editPlan.editorNote}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-slate-900">Safe alternative:</span>{" "}
                              {violation.editPlan.safeAlternative}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-slate-900">Target region:</span>{" "}
                              {violation.editPlan.targetRegion}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-slate-900">Automation:</span>{" "}
                              {violation.editPlan.automationStatus}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                    {visibleViolations.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          No clear violations detected
                        </p>
                        <p className="text-xs text-slate-500">
                          Nova did not find strong evidence against the selected market rules.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
