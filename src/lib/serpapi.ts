import "server-only";
import { fetchWithTimeout } from "@/lib/utils";
import type { NewsResult, SerpApiResponse } from "@/types/analysis";

const SERPAPI_TIMEOUT_MS = 10_000;

async function searchNews(query: string, num: number): Promise<NewsResult[]> {
  const params = new URLSearchParams({
    engine: "google_news",
    q: query,
    api_key: process.env.SERPAPI_KEY!,
    num: String(num),
  });

  const response = await fetchWithTimeout(
    `https://serpapi.com/search?${params}`,
    {},
    SERPAPI_TIMEOUT_MS,
  );

  if (!response.ok) {
    console.error(`SerpApi error: ${response.status} for query "${query}"`);
    return [];
  }

  const data: SerpApiResponse = await response.json();

  return (data.news_results ?? []).map((item) => ({
    title: item.title ?? "",
    source: item.source?.name ?? "",
    snippet: item.snippet ?? "",
    link: item.link ?? "",
  }));
}

export async function searchAuthorByName(author: string): Promise<NewsResult[]> {
  return searchNews(`"${author}"`, 30);
}

export async function searchDual(
  title: string,
  author: string,
  domain: string,
): Promise<{ globalContext: NewsResult[]; authorContext: NewsResult[] }> {
  const [globalContext, authorContext] = await Promise.all([
    searchNews(title, 20),
    searchNews(`${author} ${domain}`, 10),
  ]);

  return { globalContext, authorContext };
}
