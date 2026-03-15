const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

async function embedSnippet(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `${GEMINI_EMBED_URL}?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

export async function getEmbeddings(snippets: string[]): Promise<number[][]> {
  const results = await Promise.all(snippets.map(embedSnippet));
  return results.filter((v): v is number[] => v !== null);
}

/** Same as getEmbeddings but preserves original index for source mapping. */
export async function getEmbeddingsIndexed(
  snippets: string[],
): Promise<Array<{ index: number; embedding: number[] }>> {
  const results = await Promise.all(snippets.map(embedSnippet));
  return results
    .map((emb, index) => (emb ? { index, embedding: emb } : null))
    .filter((v): v is { index: number; embedding: number[] } => v !== null);
}
