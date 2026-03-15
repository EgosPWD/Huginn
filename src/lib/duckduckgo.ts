import "server-only";
import { fetchWithTimeout } from "@/lib/utils";
import type { DDGResponse, DDGRelatedTopic, NewsResult } from "@/types/analysis";

const DDG_URL = "https://api.duckduckgo.com/";
const DDG_TIMEOUT_MS = 5_000;

async function ddgQuery(q: string): Promise<DDGResponse | null> {
  const params = new URLSearchParams({
    q,
    format: "json",
    no_redirect: "1",
    no_html: "1",
    skip_disambig: "1",
  });

  try {
    const response = await fetchWithTimeout(
      `${DDG_URL}?${params}`,
      { headers: { "User-Agent": "Huginn/1.0 (media analysis tool)" } },
      DDG_TIMEOUT_MS,
    );
    if (!response.ok) return null;
    return (await response.json()) as DDGResponse;
  } catch {
    return null;
  }
}

function flattenTopics(topics: DDGRelatedTopic[]): DDGRelatedTopic[] {
  const result: DDGRelatedTopic[] = [];
  for (const topic of topics) {
    if (topic.Topics && topic.Topics.length > 0) {
      result.push(...flattenTopics(topic.Topics));
    } else if (topic.FirstURL) {
      result.push(topic);
    }
  }
  return result;
}

function topicsToNewsResults(topics: DDGRelatedTopic[]): NewsResult[] {
  return flattenTopics(topics)
    .filter((t) => t.FirstURL && t.Text)
    .map((t) => {
      const titleMatch = t.Result?.match(/>([^<]+)<\/a>/);
      const title = titleMatch?.[1]?.trim() ?? t.Text?.split(".")[0] ?? "";
      return {
        title,
        source: new URL(t.FirstURL!).hostname.replace(/^www\./, ""),
        snippet: t.Text ?? "",
        link: t.FirstURL!,
      };
    });
}

function mergeAndDedup(
  ...sources: Array<DDGResponse | null>
): NewsResult[] {
  const allTopics = sources.flatMap((d) => [
    ...(d?.RelatedTopics ?? []),
    ...(d?.Results ?? []),
  ]);
  const seen = new Set<string>();
  return topicsToNewsResults(allTopics).filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

function extractBio(data: DDGResponse | null): string {
  return data?.AbstractText ?? data?.Abstract ?? "";
}

// --- Author research (4 parallel queries) ---

export interface AuthorDDGResult {
  bio: string;
  articles: NewsResult[];
}

export async function searchAuthorDDG(
  author: string,
  domain: string,
): Promise<AuthorDDGResult> {
  const mediaName = domain.split(".").at(-2) ?? domain.split(".")[0];

  const [bioData, outletData, articlesData, controversyData] =
    await Promise.all([
      ddgQuery(`${author} journalist`),              // bio + career overview
      ddgQuery(`${author} ${mediaName}`),            // work at this outlet
      ddgQuery(`${author} news reporting`),          // general article history
      ddgQuery(`${author} criticism controversy`),   // notable controversies
    ]);

  const bio = extractBio(bioData) || extractBio(outletData);
  const articles = mergeAndDedup(bioData, outletData, articlesData, controversyData);

  return { bio, articles };
}

// --- Outlet + owner research (3–4 parallel queries) ---

export interface OutletDDGResult {
  outletBio: string;
  ownerBio: string;
  articles: NewsResult[];
}

export async function searchOutletDDG(
  outletName: string,
  ownerName: string | null,
): Promise<OutletDDGResult> {
  const queries: Promise<DDGResponse | null>[] = [
    ddgQuery(outletName),                               // outlet bio
    ddgQuery(`${outletName} editorial media bias`),     // editorial stance
  ];

  if (ownerName) {
    queries.push(ddgQuery(ownerName));                              // owner bio
    queries.push(ddgQuery(`${ownerName} media company interests`)); // owner context
  }

  const [outletData, editorialData, ownerData, ownerContextData] =
    await Promise.all(queries);

  const outletBio = extractBio(outletData) || extractBio(editorialData);
  const ownerBio = extractBio(ownerData ?? null) || extractBio(ownerContextData ?? null);
  const articles = mergeAndDedup(outletData, editorialData, ownerData ?? null, ownerContextData ?? null);

  return { outletBio, ownerBio, articles };
}

// --- Topic context (fallback when SerpApi has no key) ---

export async function searchTopicDDG(title: string): Promise<NewsResult[]> {
  // Truncate to first 6 words to get a clean topic query
  const topic = title.split(/\s+/).slice(0, 6).join(" ");

  const [topicData, contextData] = await Promise.all([
    ddgQuery(topic),
    ddgQuery(`${topic} analysis`),
  ]);

  return mergeAndDedup(topicData, contextData);
}
