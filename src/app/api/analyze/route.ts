import { NextRequest, NextResponse } from "next/server";
import { parseArticle } from "@/lib/parser";
import { searchDual } from "@/lib/serpapi";
import { buildOwnershipChain } from "@/lib/wikidata";
import { generateReport } from "@/lib/openrouter";
import {
  searchAuthorDDG,
  searchOutletDDG,
  searchTopicDDG,
} from "@/lib/duckduckgo";
import type { AnalysisResponse, AnalyzeRequest } from "@/types/analysis";

export async function POST(request: NextRequest) {
  // Parse body — treat malformed/empty JSON as missing URL
  let body: Partial<AnalyzeRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Step 1 — Extract article data
    const article = await parseArticle(body.url);

    // Step 2 — All data sources in parallel:
    //   Wikidata (ownership chain)
    //   SerpApi (global context + author articles)
    //   DDG author (bio + 4 queries)
    //   DDG topic (article topic context, SerpApi fallback)
    const [wikidataChain, { globalContext, authorContext }, ddgAuthor, topicContext] =
      await Promise.all([
        buildOwnershipChain(article.domain),
        searchDual(article.title, article.author, article.domain),
        searchAuthorDDG(article.author, article.domain),
        searchTopicDDG(article.title),
      ]);

    // Step 3 — DDG outlet enrichment (needs owner name from Wikidata)
    const outletName = wikidataChain.chain[0] ?? article.domain;
    const ownerName = wikidataChain.chain.length > 1
      ? wikidataChain.chain[wikidataChain.chain.length - 1]
      : null;

    const ddgOutlet = await searchOutletDDG(outletName, ownerName);

    // Merge Wikidata chain + DDG outlet bios into final ownership object
    const ownership = {
      ...wikidataChain,
      outletBio: ddgOutlet.outletBio,
      ownerBio: ddgOutlet.ownerBio,
    };

    // Merge SerpApi + DDG author articles, dedup by URL
    const seenUrls = new Set(authorContext.map((a) => a.link));
    const mergedAuthorArticles = [
      ...authorContext,
      ...ddgAuthor.articles.filter((a) => !seenUrls.has(a.link)),
    ];

    // Step 4 — LLM contrast analysis with all enriched context
    const report = await generateReport(
      article.title,
      article.author,
      article.domain,
      ownership,
      globalContext,
      mergedAuthorArticles,
      ddgAuthor.bio,
      topicContext,
    );

    const response: AnalysisResponse = {
      article,
      ownership,
      authorHistory: {
        bio: ddgAuthor.bio,
        articles: mergedAuthorArticles,
        pattern: report.authorPattern,
      },
      contrast: {
        analysis: report.contrastAnalysis,
      },
      raw: {
        globalContext,
        authorContext,
        topicContext,
        outletContext: ddgOutlet.articles,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
