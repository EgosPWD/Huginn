import { NextRequest, NextResponse } from "next/server";
import { parseArticle } from "@/lib/parser";
import { searchDual, searchAuthorByName } from "@/lib/serpapi";
import { extractTopics } from "@/lib/topic-extractor";
import { buildOwnershipChain } from "@/lib/wikidata";
import { generateReport } from "@/lib/openrouter";
import {
  searchAuthorDDG,
  searchOutletDDG,
  searchTopicDDG,
} from "@/lib/duckduckgo";
import { getEmbeddings, getEmbeddingsIndexed } from "@/lib/embeddings";
import { centroid, cosineSimilarity, divergenceScore } from "@/lib/vector-math";
import { interpretDivergence } from "@/lib/interpret";
import { generateAlerts } from "@/lib/bias-alerts";
import type { AnalysisResponse, AnalyzeRequest, NarrativeDivergence } from "@/types/analysis";

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
    const [wikidataChain, { globalContext, authorContext }, ddgAuthor, topicContext, authorByNameResults] =
      await Promise.all([
        buildOwnershipChain(article.domain),
        searchDual(article.title, article.author, article.domain),
        searchAuthorDDG(article.author, article.domain),
        searchTopicDDG(article.title),
        searchAuthorByName(article.author),
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

    // Build author topic map — merge in dedicated author search, dedup
    const topicArticlesSeen = new Set(mergedAuthorArticles.map((a) => a.link).filter(Boolean));
    const topicArticles = [
      ...mergedAuthorArticles,
      ...authorByNameResults.filter((a) => a.link && !topicArticlesSeen.has(a.link)),
    ];
    const authorTopicMap = extractTopics(topicArticles);

    // Step 4 — Narrative Divergence Score (embeddings in parallel)
    // 2 each = 4 calls total — minimum viable for centroid comparison
    const globalSnippets = globalContext.map((r) => r.snippet || r.title).filter(Boolean).slice(0, 2);
    const authorSnippets = mergedAuthorArticles.map((r) => r.snippet || r.title).filter(Boolean).slice(0, 2);

    const NULL_DIVERGENCE: NarrativeDivergence = {
      score: null,
      interpretation: "Not available",
      globalSnippetsCount: 0,
      authorSnippetsCount: 0,
      divergentSources: [],
    };

    let narrativeDivergence: NarrativeDivergence;
    try {
      const [globalEmbeds, authorIndexed] = await Promise.all([
        getEmbeddings(globalSnippets),
        getEmbeddingsIndexed(authorSnippets),
      ]);

      // Guard: if either side has no embeddings, API key is missing or all calls failed
      if (globalEmbeds.length === 0 || authorIndexed.length === 0) {
        narrativeDivergence = NULL_DIVERGENCE;
      } else {
        const globalCentroid = centroid(globalEmbeds);
        const authorEmbeds = authorIndexed.map((e) => e.embedding);
        const authorCentroid = centroid(authorEmbeds);
        const score = divergenceScore(globalCentroid, authorCentroid);

        // Rank each author article by its own distance from global consensus
        const divergentSources = authorIndexed
          .map(({ index, embedding }) => {
            const article = mergedAuthorArticles[index];
            return {
              title: article.title,
              source: article.source,
              link: article.link,
              snippet: article.snippet,
              divergenceScore: Math.round((1 - cosineSimilarity(embedding, globalCentroid)) * 10000) / 100,
            };
          })
          .sort((a, b) => b.divergenceScore - a.divergenceScore)
          .slice(0, 5);

        narrativeDivergence = {
          score,
          interpretation: interpretDivergence(score),
          globalSnippetsCount: globalEmbeds.length,
          authorSnippetsCount: authorEmbeds.length,
          divergentSources,
        };
      }
    } catch {
      narrativeDivergence = NULL_DIVERGENCE;
    }

    // Step 5 — LLM contrast analysis with all enriched context
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

    const authorHistory = {
      bio: ddgAuthor.bio,
      articles: mergedAuthorArticles,
      pattern: report.authorPattern,
    };

    const contrast = { analysis: report.contrastAnalysis };

    const raw = {
      globalContext,
      authorContext,
      topicContext,
      outletContext: ddgOutlet.articles,
    };

    const response: AnalysisResponse = {
      article,
      ownership,
      authorHistory,
      contrast,
      narrativeDivergence,
      alerts: generateAlerts({ article, ownership, authorHistory, contrast, narrativeDivergence, alerts: [], raw }),
      raw,
      authorTopicMap,
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
