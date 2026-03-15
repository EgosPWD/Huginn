"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/types/analysis";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

export function AnalyzerForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>(STATUS.IDLE);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus(STATUS.LOADING);
    setResult(null);
    setErrorMsg("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errData = data as { error?: string };
        throw new Error(errData.error ?? "Unknown error");
      }

      setResult(data as AnalysisResponse);
      setStatus(STATUS.SUCCESS);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unknown error");
      setStatus(STATUS.ERROR);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05080f] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.1),transparent_50%),linear-gradient(to_bottom,rgba(10,14,24,0.98),rgba(5,8,15,1))]" />
      </div>

      <header className="relative border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[0.16em] text-zinc-100">
              HUGINN
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Media intelligence across ownership, authorship, and narrative contrast
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Live Analysis
          </span>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Advanced Media Intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Break down ownership structures, map author behavior, and contrast the current article against external context.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/news-story"
              className={cn(
                "flex-1 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 py-3 text-sm text-zinc-100",
                "placeholder:text-zinc-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/40",
              )}
            />
            <button
              type="submit"
              disabled={status === STATUS.LOADING || !url.trim()}
              className={cn(
                "rounded-xl border border-cyan-300/40 bg-cyan-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition",
                "hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {status === STATUS.LOADING ? "Analyzing..." : "Analyze"}
            </button>
          </form>
        </section>

        {status === STATUS.LOADING && (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/70 px-5 py-6 text-zinc-400 backdrop-blur">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-cyan-400" />
            <p className="text-sm">
              Extracting article data · Running parallel search · Querying Wikidata · Generating analysis...
            </p>
          </div>
        )}

        {status === STATUS.ERROR && (
          <div className="mt-8 rounded-xl border border-red-800/70 bg-red-950/40 px-5 py-4 text-sm text-red-300">
            <span className="font-semibold">Error: </span>
            {errorMsg}
          </div>
        )}

        {status === STATUS.SUCCESS && result && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Section tag="Layer 1" label="Media Outlet" color="cyan">
              <Field label="Domain" value={result.article.domain} />
              <Field label="Title" value={result.article.title} />
              <Field
                label="Ownership chain"
                value={result.ownership.chain.join(" → ") || "Not found"}
              />
              <Field label="Summary" value={result.ownership.summary} />
              {result.ownership.outletBio && (
                <Field label="Outlet profile" value={result.ownership.outletBio} />
              )}
              {result.ownership.ownerBio && (
                <Field label="Owner profile" value={result.ownership.ownerBio} />
              )}
            </Section>

            <Section tag="Layer 2" label="Author" color="emerald">
              <Field label="Author" value={result.article.author} />
              {result.authorHistory.bio && (
                <Field label="Biography" value={result.authorHistory.bio} />
              )}
              <Field
                label="Coverage pattern"
                value={result.authorHistory.pattern}
              />
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Articles found ({result.authorHistory.articles.length})
                </p>
                {result.authorHistory.articles.length > 0 ? (
                  <ul className="space-y-1">
                    {result.authorHistory.articles.slice(0, 8).map((a, i) => (
                      <li key={i} className="text-xs text-zinc-400">
                        <span className="text-zinc-500">[{a.source}]</span>{" "}
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-zinc-200 hover:underline"
                        >
                          {a.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-600">No results</p>
                )}
              </div>
            </Section>

            <Section tag="Layer 3" label="Contrast" color="slate">
              <p className="text-sm leading-relaxed text-zinc-300">
                {result.contrast.analysis}
              </p>
            </Section>

            <details className="rounded-xl border border-white/10 bg-zinc-950/60 lg:col-span-3">
              <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-500 hover:text-zinc-300">
                Raw JSON
              </summary>
              <pre className="overflow-auto p-4 text-xs text-zinc-400">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub-components ---

interface SectionProps {
  tag: string;
  label: string;
  color: "cyan" | "emerald" | "slate";
  children: ReactNode;
}

const COLOR_MAP = {
  cyan: "border-cyan-400/20 bg-cyan-950/10",
  emerald: "border-emerald-400/20 bg-emerald-950/10",
  slate: "border-zinc-700/70 bg-zinc-900/70",
} as const;

const TAG_COLOR_MAP = {
  cyan: "border border-cyan-300/30 bg-cyan-500/10 text-cyan-200",
  emerald: "border border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
  slate: "border border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
} as const;

function Section({ tag, label, color, children }: SectionProps) {
  return (
    <div className={cn("rounded-xl border p-5 backdrop-blur", COLOR_MAP[color])}>
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-semibold",
            TAG_COLOR_MAP[color],
          )}
        >
          {tag}
        </span>
        <h2 className="font-semibold text-white">{label}</h2>
      </div>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="mb-3 rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-zinc-200">{value || "-"}</p>
    </div>
  );
}
