import "server-only";
import { fetchWithTimeout } from "@/lib/utils";
import type { LLMReport, NewsResult, Ownership } from "@/types/analysis";

const OPENROUTER_TIMEOUT_MS = 30_000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

function snippets(items: NewsResult[], limit: number): string {
  return items
    .slice(0, limit)
    .map((r) => `- [${r.source}] ${r.title}: ${r.snippet}`)
    .join("\n") || "No results";
}

function buildUserPrompt(
  title: string,
  author: string,
  domain: string,
  ownership: Ownership,
  globalContext: NewsResult[],
  authorContext: NewsResult[],
  authorBio: string,
  topicContext: NewsResult[],
): string {
  return `
ARTICLE:
- Title: ${title}
- Author: ${author}
- Outlet: ${domain}

OWNERSHIP CHAIN (from Wikidata):
${ownership.summary}
Levels: ${ownership.chain.join(" → ") || "Not available"}

OUTLET PROFILE (from DuckDuckGo):
${ownership.outletBio || "No information available"}

OWNER PROFILE (from DuckDuckGo):
${ownership.ownerBio || "No information available"}

AUTHOR BIO (from DuckDuckGo):
${authorBio || "No biographical information available"}

AUTHOR COVERAGE HISTORY:
${snippets(authorContext, 8)}

GLOBAL NEWS CONTEXT (other coverage on this topic, from Google News):
${snippets(globalContext, 5)}

TOPIC CONTEXT (from DuckDuckGo, broader perspective):
${snippets(topicContext, 5)}

Respond ONLY with valid JSON in this exact shape:
{
  "ownershipSummary": "Who owns the outlet and what are the editorial implications of that ownership",
  "authorPattern": "What patterns emerge from the author's coverage history and public profile",
  "contrastAnalysis": "How the ownership interests, author history, and framing of this specific article relate to each other"
}
  `.trim();
}

export async function generateReport(
  title: string,
  author: string,
  domain: string,
  ownership: Ownership,
  globalContext: NewsResult[],
  authorContext: NewsResult[],
  authorBio: string,
  topicContext: NewsResult[],
): Promise<LLMReport> {
  const fallback: LLMReport = {
    ownershipSummary: "Not available",
    authorPattern: "Not available",
    contrastAnalysis: "Not available",
  };

  try {
    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          "You are a media analyst. Objectively analyze the relationship between media ownership, author history, and current coverage. Always respond with valid JSON.",
      },
      {
        role: "user",
        content: buildUserPrompt(
          title,
          author,
          domain,
          ownership,
          globalContext,
          authorContext,
          authorBio,
          topicContext,
        ),
      },
    ];

    const response = await fetchWithTimeout(
      OPENROUTER_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://huginn.app",
          "X-Title": "Huginn Media Intelligence",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      },
      OPENROUTER_TIMEOUT_MS,
    );

    if (!response.ok) {
      console.error(`OpenRouter error: ${response.status}`);
      return fallback;
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Partial<LLMReport>;

    return {
      ownershipSummary: parsed.ownershipSummary ?? fallback.ownershipSummary,
      authorPattern: parsed.authorPattern ?? fallback.authorPattern,
      contrastAnalysis: parsed.contrastAnalysis ?? fallback.contrastAnalysis,
    };
  } catch (error) {
    console.error("OpenRouter failed:", error);
    return fallback;
  }
}
