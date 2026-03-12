"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";

type ViewState = "upload" | "processing" | "review";

type Violation = {
  id: string;
  market: string;
  modality: "Visual" | "Audio" | "Cross-Modal";
  start_time: number;
  end_time: number;
  display_time: string;
  issue: string;
  suggestion: string;
};

const MOCK_VIOLATIONS: Violation[] = [
  {
    id: "v1",
    market: "UAE",
    modality: "Visual",
    start_time: 12.5,
    end_time: 15.0,
    display_time: "00:12",
    issue: "Alcohol consumption visible on screen.",
    suggestion: "Apply blur to the glass or cut scene.",
  },
  {
    id: "v2",
    market: "Germany",
    modality: "Cross-Modal",
    start_time: 45.0,
    end_time: 48.5,
    display_time: "00:45",
    issue: "Audio implies violence while visual shows restricted symbols.",
    suggestion: "Requires full scene removal for region.",
  },
  {
    id: "v3",
    market: "USA",
    modality: "Audio",
    start_time: 82.0,
    end_time: 84.0,
    display_time: "01:22",
    issue: "Explicit language detected in background dialogue.",
    suggestion: "Bleep or mute audio track segment.",
  },
];

const MARKETS = ["UAE", "Germany", "USA", "India", "South Korea", "Brazil"];

const PROCESSING_STEPS = [
  "Extracting Audio...",
  "Analyzing Visual Frames...",
  "Checking Cross-Modal Context...",
  "Comparing against regional rulesets...",
];

const modalityStyles: Record<Violation["modality"], string> = {
  Visual: "bg-rose-100 text-rose-700",
  Audio: "bg-amber-100 text-amber-700",
  "Cross-Modal": "bg-indigo-100 text-indigo-700",
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
  const [processingKey, setProcessingKey] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (view !== "processing") return;
    setPhaseIndex(0);
    setProcessingKey((prev) => prev + 1);
    const stepInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % PROCESSING_STEPS.length);
    }, 700);
    const processingTimeout = setTimeout(() => {
      setView("review");
    }, 3600);
    return () => {
      clearInterval(stepInterval);
      clearTimeout(processingTimeout);
    };
  }, [view]);

  const visibleViolations = useMemo(
    () => MOCK_VIOLATIONS.filter((violation) => selectedMarkets.includes(violation.market)),
    [selectedMarkets]
  );

  useEffect(() => {
    if (view !== "review" || visibleViolations.length === 0) return;
    setActiveViolationId((prev) => prev ?? visibleViolations[0].id);
  }, [view, visibleViolations]);

  const complianceScore = Math.max(82, 100 - visibleViolations.length * 6);
  const timelineDuration = duration || 120;
  const canAnalyze = Boolean(file) && selectedMarkets.length > 0;

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
  };

  const handleAnalyze = () => {
    if (!canAnalyze) return;
    setView("processing");
  };

  const handleViolationClick = (violation: Violation) => {
    setActiveViolationId(violation.id);
    if (videoRef.current) {
      videoRef.current.currentTime = violation.start_time;
      const playAttempt = videoRef.current.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => undefined);
      }
    }
  };

  const handleReset = () => {
    setView("upload");
    setFile(null);
    setActiveViolationId(null);
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
                Command Center - Nova 2 Omni-ready compliance intelligence
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
              <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
                Mock analysis mode
              </div>
            )}
          </div>
        </header>

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
                        Upload a Creative Commons film or internal asset for multi-market analysis.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-[#2F3CFF] px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_35px_-25px_rgba(47,60,255,0.8)] transition hover:bg-[#3c48ff]"
                    >
                      Browse files
                    </button>
                    <p className="text-xs text-slate-400">MP4, MOV, WEBM up to 1GB</p>
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
                        Choose jurisdictions for compliance analysis.
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
                      <p className="text-sm font-semibold text-slate-900">Nova 2 Omni Pipeline</p>
                      <p className="text-xs text-slate-500">
                        Single-pass cross-modal reasoning with per-market rules.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">3.4s</p>
                      <p>Estimated runtime</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">Multi-modal</p>
                      <p>Audio + Visual + Text</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">5 regions</p>
                      <p>Rulesets active</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-slate-900">Bedrock-ready</p>
                      <p>API plug-in later</p>
                    </div>
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
                  Analyze Compliance
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
                      Nova 2 Omni is processing your video
                    </p>
                    <p className="text-xs text-slate-500">
                      Multi-modal reasoning in progress across {selectedMarkets.length} markets.
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
                    key={processingKey}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3.6, ease: "easeInOut" }}
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

          {view === "review" && (
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
                    Across {selectedMarkets.length} markets
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
                    Auto-flagged with suggested edits
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Review Status
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-lg font-semibold">Ready for action</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Click a violation to jump to scene.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.6)] backdrop-blur">
                  <div className="flex items-center justify-between">
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

                  <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-slate-900">
                    {videoUrl ? (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className="h-full w-full object-cover"
                        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
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
                          <div className="flex items-center justify-between">
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
                              Flagged
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">{violation.issue}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Suggested action: {violation.suggestion}
                          </p>
                        </motion.button>
                      );
                    })}
                    {visibleViolations.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          No violations detected
                        </p>
                        <p className="text-xs text-slate-500">
                          Adjust selected markets or upload a different asset.
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
