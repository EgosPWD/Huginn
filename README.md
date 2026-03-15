# Huginn — Media Intelligence

Paste a news article URL and Huginn tells you who owns the outlet, what the author has covered before, how an AI reads the relationship between the two — and now, how far the author's narrative deviates from the global consensus, measured mathematically via vector embeddings.

## What it does

Four layers of analysis, in order:

**Layer 1 — The Outlet**
Who owns the media company that published the article. Ownership chain traversed up to 3 levels via Wikidata SPARQL (e.g. CNN → Warner Bros. Discovery).

**Layer 2 — The Author**
Author biography and coverage history pulled from DuckDuckGo Instant Answer API and SerpApi Google News. Shows patterns in how the author has covered similar topics.

**Layer 3 — The Contrast**
AI-generated analysis (via OpenRouter + Llama 3.3 70B) that connects the ownership chain, the author's history, and the current article's framing.

**Layer 4 — Narrative Divergence Score**
A vector-based measurement of how far the author's body of work deviates from the global news consensus on the same topic.

Each article title/snippet from the author's history and from the global context (SerpApi) is converted into a high-dimensional vector using the Google Gemini Embedding API (`gemini-embedding-001`, 3072 dimensions). A centroid is computed for each group. The cosine distance between the two centroids is the divergence score (0–100). The 5 author articles farthest from the global centroid are surfaced as the most divergent sources.

```
globalContext snippets ──► embeddings ──► centroid_global ─┐
                                                            ├──► cosine distance ──► score 0–100
authorContext snippets  ──► embeddings ──► centroid_author ─┘

Per-article distances from centroid_global ──► top-5 most divergent author sources
```

Score ranges:
| Score | Interpretation |
|-------|---------------|
| 0–20 | Author aligns with the global consensus on this topic |
| 21–40 | Slight narrative divergence detected |
| 41–60 | Moderate divergence — author covers this topic differently from the consensus |
| 61–80 | High narrative divergence — clearly differentiated perspective |
| 81–100 | Isolated narrative — author diverges significantly from the global consensus |

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Runtime / Package manager | Bun |
| Article extraction | Postlight Parser + OG meta fallback |
| News search | SerpApi Google News |
| Author bio | DuckDuckGo Instant Answer API (no key) |
| Ownership data | Wikidata SPARQL (public endpoint, no key) |
| AI analysis | OpenRouter → `meta-llama/llama-3.3-70b-instruct` |
| Embeddings | Google Gemini API → `gemini-embedding-001` (3072 dims) |
| Vector math | Custom pure functions (centroid, cosine similarity) |

## Project structure

```
src/
├── app/
│   ├── _components/
│   │   └── AnalyzerForm.tsx   # Client component — URL input + 4-layer results UI
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts       # POST /api/analyze — main pipeline
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── parser.ts              # Postlight Parser wrapper + OG meta fallback
│   ├── serpapi.ts             # SerpApi Google News (global context + author history)
│   ├── wikidata.ts            # SPARQL ownership chain traversal
│   ├── duckduckgo.ts          # DuckDuckGo Instant Answer (author bio + articles)
│   ├── openrouter.ts          # LLM report generation
│   ├── embeddings.ts          # Gemini embedding API calls (per-snippet, indexed)
│   ├── vector-math.ts         # centroid(), cosineSimilarity(), divergenceScore()
│   ├── interpret.ts           # Score → human-readable interpretation
│   └── utils.ts               # cn() + fetchWithTimeout()
└── types/
    └── analysis.ts            # All TypeScript interfaces
testsprite_tests/              # AI-generated backend test cases (TestSprite)
```

## API

### `POST /api/analyze`

**Request**
```json
{ "url": "https://edition.cnn.com/2025/09/16/politics/..." }
```

**Response**
```json
{
  "article": {
    "title": "string",
    "author": "string",
    "domain": "string",
    "content": "string"
  },
  "ownership": {
    "chain": ["CNN", "Warner Bros. Discovery"],
    "summary": "string",
    "outletBio": "string",
    "ownerBio": "string"
  },
  "authorHistory": {
    "bio": "string",
    "articles": [{ "title": "", "source": "", "snippet": "", "link": "" }],
    "pattern": "string"
  },
  "contrast": {
    "analysis": "string"
  },
  "narrativeDivergence": {
    "score": 19.9,
    "interpretation": "Author aligns with the global consensus on this topic",
    "globalSnippetsCount": 2,
    "authorSnippetsCount": 42,
    "divergentSources": [
      {
        "title": "string",
        "source": "string",
        "link": "string",
        "snippet": "string",
        "divergenceScore": 45.8
      }
    ]
  },
  "raw": {
    "globalContext": [],
    "authorContext": [],
    "topicContext": [],
    "outletContext": []
  }
}
```

If the Gemini API is unavailable, `narrativeDivergence.score` is `null`, `divergentSources` is `[]`, and `interpretation` is `"Not available"`.

**Error responses**
- `400` — missing or invalid URL
- `500` — unexpected server error

## Pipeline

```
URL
 │
 ▼
Postlight Parser ──────────────────────► title, author, domain, content
 │                                        (OG meta fallback if blocked)
 ▼
Promise.all ────────────────────────────► 4 parallel calls:
 ├── Wikidata SPARQL                        ownership chain (up to 3 levels)
 ├── SerpApi Google News (×2)               global context (20) + author history (10)
 ├── DuckDuckGo author                      author bio + articles
 └── DuckDuckGo topic                       broader topic context
 │
 ▼
DDG outlet enrichment ─────────────────► outlet bio + owner bio (sequential, needs Wikidata)
 │
 ▼
Gemini Embeddings ──── Promise.all ────► embed globalContext snippets
 │                                        embed authorContext snippets (indexed)
 ├── centroid(globalEmbeds)
 ├── centroid(authorEmbeds)
 ├── divergenceScore = (1 - cosineSimilarity) × 100
 └── top-5 author articles by distance from globalCentroid
 │
 ▼
OpenRouter / Llama 3.3 70B ─────────────► contrast analysis JSON
```

Every external call has a timeout. If any integration fails, the pipeline continues with graceful degradation — the endpoint always returns 200 with whatever data is available.

## Setup

**1. Install dependencies**
```bash
bun install
```

**2. Configure environment variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
SERPAPI_KEY=your_serpapi_key
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_AI_API_KEY=your_google_ai_studio_key
```

DuckDuckGo and Wikidata require no API keys.

Get your Google AI key at [aistudio.google.com](https://aistudio.google.com) — the `gemini-embedding-001` model is free within quota.

**3. Run**
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Source |
|----------|----------|--------|
| `SERPAPI_KEY` | Yes | [serpapi.com](https://serpapi.com) |
| `OPENROUTER_API_KEY` | Yes | [openrouter.ai](https://openrouter.ai) |
| `GOOGLE_AI_API_KEY` | Yes (Layer 4) | [aistudio.google.com](https://aistudio.google.com) |

## Resilience

| Integration | Failure behavior |
|-------------|-----------------|
| Postlight Parser | Falls back to OG meta tag extraction |
| SerpApi (401 / timeout) | Returns empty arrays, pipeline continues |
| Wikidata (no result / timeout) | Returns `{ chain: [], summary: "Not found" }` |
| DuckDuckGo (timeout) | Returns empty bio and articles |
| OpenRouter (401 / timeout / empty response) | Returns `"Not available"` strings for all LLM fields |
| Gemini Embeddings (no key / timeout / all fail) | Returns `{ score: null, divergentSources: [] }` — never returns false 100.0 |
