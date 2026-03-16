import "server-only";
import Parser from "@postlight/parser";
import { fetchWithTimeout } from "@/lib/utils";
import type { Article } from "@/types/analysis";

const META_TIMEOUT_MS = 5_000;

// Fallback: fetch HTML directly and extract OG/meta tags
// Needed for sites that block Postlight's user-agent (e.g. CNN)
async function fetchMetaFallback(
  url: string,
): Promise<{ title: string | null; author: string | null; content: string | null }> {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        },
      },
      META_TIMEOUT_MS,
    );

    if (!response.ok) return { title: null, author: null, content: null };

    const html = await response.text();

    // og:title — double and single quotes, both attribute orders + twitter fallback + <title>
    const titleMatch =
      html.match(/property="og:title"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+property="og:title"/) ??
      html.match(/property='og:title'\s+content='([^']+)'/) ??
      html.match(/content='([^']+)'\s+property='og:title'/) ??
      html.match(/name="twitter:title"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+name="twitter:title"/) ??
      html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);

    // author meta — standard, OG, and twitter variants
    const authorMatch =
      html.match(/name="author"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+name="author"/) ??
      html.match(/property="article:author"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+property="article:author"/) ??
      html.match(/name="twitter:creator"\s+content="([^"@][^"]+)"/) ??
      html.match(/"author"\s*:\s*\{\s*"@type"[^}]*"name"\s*:\s*"([^"]+)"/);

    // og:description — double and single quotes
    const descMatch =
      html.match(/property="og:description"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+property="og:description"/) ??
      html.match(/property='og:description'\s+content='([^']+)'/) ??
      html.match(/name="description"\s+content="([^"]+)"/);

    return {
      title: titleMatch?.[1]?.trim() ?? null,
      author: authorMatch?.[1]?.trim() ?? null,
      content: descMatch?.[1]?.trim() ?? null,
    };
  } catch {
    return { title: null, author: null, content: null };
  }
}

export async function parseArticle(url: string): Promise<Article> {
  const domain = new URL(url).hostname.replace(/^www\./, "");

  // Try Postlight first
  let title: string | null = null;
  let author: string | null = null;
  let content: string | null = null;

  try {
    const result = await Parser.parse(url);
    title = result.title ?? null;
    author = result.author ?? null;
    content = result.content ? result.content.slice(0, 500) : null;
  } catch {
    // Postlight failed entirely, proceed to fallback
  }

  // Fallback: OG meta tags if Postlight missed title or author
  if (!title || !author) {
    const meta = await fetchMetaFallback(url);
    title = title ?? meta.title;
    author = author ?? meta.author;
    content = content ?? meta.content;
  }

  return {
    title: title ?? "Unknown",
    author: author ?? "Unknown",
    domain,
    content: content ?? "",
  };
}
