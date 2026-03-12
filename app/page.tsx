"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  BadgeCheck,
  Boxes,
  Globe,
  LayoutGrid,
  Radar,
  ShieldCheck,
  Sparkles,
  Timer,
  Video,
  Wand2,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

const capabilityCards = [
  {
    icon: Sparkles,
    title: "Nova 2 Omni reasoning",
    description:
      "Single-pass, cross-modal intelligence correlating audio, visual, and text cues.",
  },
  {
    icon: ShieldCheck,
    title: "Per-market compliance",
    description:
      "Timestamped violations mapped to local regulations and brand safety rulesets.",
  },
  {
    icon: Wand2,
    title: "Suggested edits",
    description:
      "Actionable remediation guidance so editors resolve issues without manual discovery.",
  },
];

const workflow = [
  {
    icon: Video,
    title: "Ingest full video",
    description: "Upload assets and select target markets for compliance analysis.",
  },
  {
    icon: AudioLines,
    title: "Cross-modal reasoning",
    description: "Nova 2 Omni correlates audio, visuals, and text in one pass.",
  },
  {
    icon: LayoutGrid,
    title: "Compliance dashboard",
    description: "Review violations, timelines, and recommended actions instantly.",
  },
];

const signals = [
  {
    label: "UAE - Visual",
    detail: "Alcohol depiction",
    risk: 86,
    color: "bg-rose-400",
  },
  {
    label: "Germany - Cross-Modal",
    detail: "Audio + symbol conflict",
    risk: 74,
    color: "bg-indigo-500",
  },
  {
    label: "USA - Audio",
    detail: "Explicit language",
    risk: 62,
    color: "bg-amber-400",
  },
];

const stats = [
  { label: "Markets supported", value: "50+", note: "Regulations mapped" },
  { label: "Review time", value: "Minutes", note: "Not weeks" },
  { label: "Annual savings", value: "$50M+", note: "Per studio" },
];

const markets = ["Germany", "UAE", "South Korea", "Brazil", "USA", "India"];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F5F7FB]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 right-[-15%] h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#e7ecff,transparent_50%)]" />
        <div className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-24 px-6 py-10">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2F3CFF] text-white shadow-[0_10px_30px_-18px_rgba(47,60,255,0.9)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[#2F3CFF]">Reel Audit</p>
              <p className="text-xs text-slate-500">Global AI Video Compliance</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex">
            <a href="#problem" className="transition hover:text-slate-900">
              Problem
            </a>
            <a href="#solution" className="transition hover:text-slate-900">
              Solution
            </a>
            <a href="#workflow" className="transition hover:text-slate-900">
              Workflow
            </a>
            <a href="#stack" className="transition hover:text-slate-900">
              Stack
            </a>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[#2F3CFF] px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_40px_-25px_rgba(47,60,255,0.8)] transition hover:bg-[#3c48ff]"
          >
            Launch Dashboard
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>

        <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeUp} className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1 text-xs font-semibold text-[#2F3CFF] shadow-sm">
              <Radar className="h-3.5 w-3.5" />
              Nova 2 Omni reasoning layer
            </div>
            <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Reel Audit
              <span className="block text-[#2F3CFF]">Global AI Video Compliance Engine</span>
            </h1>
            <p className="max-w-xl text-base text-slate-600 md:text-lg">
              Ship content across dozens of jurisdictions without weeks of manual review. Reel Audit
              flags violations, maps them to local rules, and recommends edits instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#2F3CFF] px-6 py-3 text-sm font-semibold text-white shadow-[0_15px_40px_-25px_rgba(47,60,255,0.8)] transition hover:bg-[#3c48ff]"
              >
                Open Compliance Workspace
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-[#2F3CFF]"
              >
                See how it works
              </a>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#2F3CFF]" />
                50+ market rulesets supported
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                Enterprise-grade audit trails
              </span>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.6)] backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Compliance Control Tower</p>
                <p className="text-xs text-slate-500">Live signal health across markets</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-[#f7f8ff] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Live signals</span>
                <Timer className="h-3.5 w-3.5 text-[#2F3CFF]" />
              </div>
              <div className="mt-4 grid gap-3">
                {signals.map((signal) => (
                  <div key={signal.label} className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{signal.label}</span>
                      <span>{signal.risk}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{signal.detail}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${signal.color}`}
                        style={{ width: `${signal.risk}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {markets.map((market) => (
                  <span
                    key={market}
                    className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-semibold text-[#2F3CFF]"
                  >
                    {market}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="problem" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div {...fadeUp} className="rounded-[28px] border border-slate-200 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
              The Core Problem
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-slate-900">
              Global compliance is still manual, slow, and expensive.
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Teams review every cut for every territory. What is legal in Germany can trigger bans
              in Singapore. The result: weeks of delay, millions in cost, and inconsistent
              enforcement.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-[28px] border border-slate-200 bg-white p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              The Reel Audit Solution
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-slate-900">
              One AI pass across audio, visual, and text.
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Nova 2 Omni correlates audio, visual frames, dialogue, and on-screen text
              simultaneously, flagging cross-modal conflicts that single-modal tools miss.
            </p>
          </motion.div>
        </section>

        <section id="solution" className="grid gap-6 lg:grid-cols-3">
          {capabilityCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#2F3CFF] transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </motion.div>
            );
          })}
        </section>

        <section id="workflow" className="rounded-[32px] border border-slate-200 bg-white p-10">
          <motion.div {...fadeUp} className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F3CFF]">
              Workflow
            </p>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Upload, reason, and review in one flow.
            </h2>
            <p className="max-w-2xl text-sm text-slate-600">
              Designed for content executives and compliance teams who need clear, defensible
              decisions at scale.
            </p>
          </motion.div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  {...fadeUp}
                  transition={{ duration: 0.35, delay: index * 0.1 }}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>0{index + 1}</span>
                    <Icon className="h-4 w-4 text-[#2F3CFF]" />
                  </div>
                  <h3 className="font-display mt-4 text-base font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="stack" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div {...fadeUp} className="rounded-[28px] border border-slate-200 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F3CFF]">
              Technology Stack
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-slate-900">
              Built for enterprise compliance scale.
            </h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Nova 2 Omni (Bedrock)</span>
                <span className="font-semibold text-slate-900">Reasoning Core</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>AWS MediaConvert</span>
                <span className="font-semibold text-slate-900">Frame Extraction</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>DynamoDB</span>
                <span className="font-semibold text-slate-900">Ruleset Storage</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Next.js + React</span>
                <span className="font-semibold text-slate-900">Compliance UI</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-[28px] border border-slate-200 bg-white p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Why It Wins
            </p>
            <div className="mt-4 grid gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                <Boxes className="h-4 w-4 text-emerald-600" />
                Cross-modal conflicts detected instantly.
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Per-market violations with remediation guidance.
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Audit-ready reports for executives and regulators.
              </div>
            </div>
          </motion.div>
        </section>

        <section className="rounded-[32px] border border-indigo-100 bg-[#2F3CFF] px-8 py-10 text-white shadow-[0_25px_60px_-45px_rgba(47,60,255,0.85)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                Ready to pilot Reel Audit across your catalog?
              </h2>
              <p className="mt-2 text-sm text-indigo-100">
                Launch the compliance dashboard and experience the end-to-end workflow.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2F3CFF] shadow-sm transition hover:bg-indigo-50"
            >
              Launch Dashboard
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
