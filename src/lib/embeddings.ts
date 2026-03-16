const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

async function embedSnippet(text: string): Promise<number[] | null> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.warn("[embeddings] GOOGLE_AI_API_KEY is not set — skipping embedding");
    return null;
  }

  try {
    const res = await fetch(
      `${GEMINI_EMBED_URL}?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(`[embeddings] API error ${res.status} ${res.statusText}:`, errBody);
      return null;
    }

    const data = await res.json();
    const values = data?.embedding?.values ?? null;
    if (!values) {
      console.error("[embeddings] Unexpected response shape:", JSON.stringify(data).slice(0, 200));
    }
    return values;
  } catch (err) {
    console.error("[embeddings] fetch threw:", err);
    return null;
  }
}

export async function getEmbeddings(snippets: string[]): Promise<number[][]> {
  const results: (number[] | null)[] = [];
  for (const snippet of snippets) {
    results.push(await embedSnippet(snippet));
  }
  return results.filter((v): v is number[] => v !== null);
}

/** Same as getEmbeddings but preserves original index for source mapping. */
export async function getEmbeddingsIndexed(
  snippets: string[],
): Promise<Array<{ index: number; embedding: number[] }>> {
  const results: (number[] | null)[] = [];
  for (const snippet of snippets) {
    results.push(await embedSnippet(snippet));
  }
  return results
    .map((emb, index) => (emb ? { index, embedding: emb } : null))
    .filter((v): v is { index: number; embedding: number[] } => v !== null);
}
