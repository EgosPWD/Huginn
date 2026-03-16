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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#05080f] text-zinc-100">
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

            <div className="rounded-xl border border-violet-400/20 bg-violet-950/10 p-5 backdrop-blur lg:col-span-3">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-200">
                  Layer 4
                </span>
                <h2 className="font-semibold text-white">Narrative Divergence</h2>
              </div>

              {result.narrativeDivergence.score === null ? (
                <p className="text-sm text-zinc-500">
                  {result.narrativeDivergence.interpretation}
                </p>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/5 bg-zinc-900/60 px-6 py-4">
                    <span className="text-4xl font-bold tabular-nums text-violet-200">
                      {result.narrativeDivergence.score.toFixed(1)}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">/ 100</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
                        <span>Alignment</span>
                        <span>Divergence</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            result.narrativeDivergence.score <= 20 && "bg-emerald-500",
                            result.narrativeDivergence.score > 20 && result.narrativeDivergence.score <= 40 && "bg-yellow-400",
                            result.narrativeDivergence.score > 40 && result.narrativeDivergence.score <= 60 && "bg-amber-500",
                            result.narrativeDivergence.score > 60 && result.narrativeDivergence.score <= 80 && "bg-orange-500",
                            result.narrativeDivergence.score > 80 && "bg-red-500",
                          )}
                          style={{ width: `${result.narrativeDivergence.score}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300">
                      {result.narrativeDivergence.interpretation}
                    </p>

                    <div className="flex gap-3 text-xs text-zinc-500">
                      <span className="rounded border border-white/5 bg-zinc-900/60 px-2 py-0.5">
                        {result.narrativeDivergence.globalSnippetsCount} global snippets
                      </span>
                      <span className="rounded border border-white/5 bg-zinc-900/60 px-2 py-0.5">
                        {result.narrativeDivergence.authorSnippetsCount} author snippets
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {result.narrativeDivergence.divergentSources.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Most divergent author sources
                  </p>
                  <ul className="space-y-2">
                    {result.narrativeDivergence.divergentSources.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
                            s.divergenceScore > 60
                              ? "bg-red-500/15 text-red-300"
                              : s.divergenceScore > 40
                                ? "bg-orange-500/15 text-orange-300"
                                : "bg-yellow-500/15 text-yellow-300",
                          )}
                        >
                          {s.divergenceScore.toFixed(1)}
                        </span>
                        <div className="min-w-0">
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs font-medium text-zinc-200 hover:text-violet-300 hover:underline"
                          >
                            {s.title}
                          </a>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            <span className="text-zinc-400">[{s.source}]</span>{" "}
                            {s.snippet}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.alerts.length > 0 && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-950/10 p-5 backdrop-blur lg:col-span-3">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-md border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                    ⚠ Alerts
                  </span>
                  <h2 className="font-semibold text-white">Bias Alerts Detected</h2>
                </div>
                <ul className="space-y-3">
                  {result.alerts.map((alert, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border px-4 py-3",
                        alert.level === "HIGH" && "border-red-800/50 bg-red-950/30",
                        alert.level === "MEDIUM" && "border-amber-800/50 bg-amber-950/30",
                        alert.level === "LOW" && "border-blue-800/50 bg-blue-950/30",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs font-bold",
                          alert.level === "HIGH" && "bg-red-500/20 text-red-300",
                          alert.level === "MEDIUM" && "bg-amber-500/20 text-amber-300",
                          alert.level === "LOW" && "bg-blue-500/20 text-blue-300",
                        )}
                      >
                        {alert.level}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {alert.code.replaceAll("_", " ")}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-200">{alert.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

      <footer className="relative border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 text-sm text-zinc-400 sm:flex-row sm:items-center">
          <p className="text-xs tracking-wide text-zinc-500">
            HUGINN MEDIA INTELLIGENCE
          </p>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/EgosPWD/Huginn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.25c-3.34.73-4.05-1.61-4.05-1.61a3.2 3.2 0 0 0-1.35-1.76c-1.1-.75.08-.73.08-.73a2.54 2.54 0 0 1 1.86 1.25 2.57 2.57 0 0 0 3.5 1 2.57 2.57 0 0 1 .77-1.61c-2.67-.31-5.47-1.33-5.47-5.93a4.64 4.64 0 0 1 1.24-3.22 4.3 4.3 0 0 1 .12-3.18s1-.32 3.3 1.23a11.36 11.36 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23a4.3 4.3 0 0 1 .12 3.18 4.63 4.63 0 0 1 1.24 3.22c0 4.61-2.8 5.61-5.48 5.92a2.87 2.87 0 0 1 .82 2.23v3.31c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
              </svg>
              GitHub
            </a>

            <a
              href="https://x.com/quod_ego"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X profile"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.9 2H22l-6.78 7.75L23 22h-6.06l-4.75-6.2L6.77 22H3.66l7.25-8.29L1 2h6.22l4.3 5.69L18.9 2Zm-1.06 18h1.68L6.31 3.9H4.5L17.84 20Z" />
              </svg>
              @quod_ego
            </a>
          </div>
        </div>
      </footer>
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
