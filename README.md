# Huginn — Media Intelligence

**Live:** [huginn.info](https://huginn.info)

Paste a news article URL and Huginn tells you who owns the outlet, what the author has covered before, how their narrative deviates from the global consensus — and raises automated bias alerts when conflict-of-interest signals are detected.

## What it does

Six layers of analysis, in order:

**Layer 1 — The Outlet**
Who owns the media company that published the article. Ownership chain traversed up to 3 levels via Wikidata SPARQL (e.g. CNN → Warner Bros. Discovery). Enriched with DuckDuckGo abstracts for the outlet and the ultimate owner.

**Layer 2 — The Author**
Author biography and coverage history pulled from DuckDuckGo Instant Answer API and SerpApi Google News. Shows patterns in how the author has covered similar topics.

**Layer 2.5 — Author Coverage Map**
A dedicated SerpApi search (`"${author}"`, 30 results) runs in parallel with the rest of the pipeline. Results are merged and deduplicated against Layer 2 articles, then classified into topic buckets (Nuclear Policy, Iran, Russia/Ukraine, National Security, etc.) using keyword matching. Displayed as an interactive collapsible tree with a horizontal bar chart showing topic distribution.

```
[David E. Sanger]
 ├──► [National Security]    (8 articles)  ← click to expand
 ├──► [Iran]                 (6 articles)
 ├──► [Russia / Ukraine]     (4 articles)
 └──► [Nuclear Policy]       (3 articles)
```

**Layer 3 — The Contrast**
AI-generated analysis (via OpenRouter → `openrouter/free`) that connects the ownership chain, the author's history, and the current article's framing.

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

**Layer 5 — Bias Alerts**
Three deterministic rules (no AI) that fire independently of the LLM:

| Code | Level | Trigger |
|------|-------|---------|
| `CONFLICT_OF_INTEREST` | HIGH | Author has no articles that mention the outlet's owner with critical language |
| `NARRATIVE_ISOLATION` | MEDIUM | Divergence score strictly > 70 |
| `MEDIA_CONCENTRATION` | LOW | Owner's bio mentions 3+ known media brands |

Alerts are sorted HIGH → MEDIUM → LOW. If no rule fires, `alerts` is an empty array.

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
| AI analysis | OpenRouter → `openrouter/free` (routes to best available free model) |
| Embeddings | Google Gemini API → `gemini-embedding-001` (3072 dims) |
| Vector math | Custom pure functions (centroid, cosine similarity) |
| Topic classification | Keyword matching (10 buckets, no external call) |
| Bias detection | Deterministic rule engine (3 rules, no external call) |

## Project structure

```
src/
├── app/
│   ├── _components/
│   │   └── AnalyzerForm.tsx   # Client component — URL input + full results UI
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts       # POST /api/analyze — main pipeline orchestrator
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── parser.ts              # Postlight Parser wrapper + OG meta fallback
│   ├── serpapi.ts             # SerpApi: global context (20), author+domain (10), author by name (30)
│   ├── wikidata.ts            # SPARQL ownership chain traversal (up to 3 levels)
│   ├── duckduckgo.ts          # DDG Instant Answer: author bio, outlet bio, topic context
│   ├── openrouter.ts          # LLM report generation (ownership summary + contrast analysis)
│   ├── embeddings.ts          # Gemini embedding API calls (per-snippet, indexed)
│   ├── vector-math.ts         # centroid(), cosineSimilarity(), divergenceScore()
│   ├── interpret.ts           # Score → human-readable interpretation
│   ├── topic-extractor.ts     # Keyword-based article → topic bucket classifier
│   ├── bias-alerts.ts         # Deterministic rule engine → Alert[]
│   └── utils.ts               # cn() + fetchWithTimeout()
└── types/
    └── analysis.ts            # All TypeScript interfaces
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
    "authorSnippetsCount": 2,
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
  "authorTopicMap": {
    "totalArticles": 34,
    "topics": [
      { "topic": "National Security", "count": 8, "articles": [] },
      { "topic": "Iran", "count": 6, "articles": [] }
    ]
  },
  "alerts": [
    {
      "level": "HIGH",
      "code": "CONFLICT_OF_INTEREST",
      "message": "The author has never criticized the outlet's owner"
    }
  ],
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
Promise.all ────────────────────────────► 5 parallel calls:
 ├── Wikidata SPARQL                        ownership chain (up to 3 levels)
 ├── SerpApi Google News ×2                 global context (20) + author+domain (10)
 ├── SerpApi Google News ×1                 dedicated author search — "author name" (30)
 ├── DuckDuckGo author                      bio + articles (4 parallel queries)
 └── DuckDuckGo topic                       broader topic context
 │
 ▼
DDG outlet enrichment ─────────────────► outlet bio + owner bio (sequential, needs Wikidata result)
 │
 ▼
Dedup + merge ─────────────────────────► all author articles unified, no duplicate URLs
 │
 ▼
Topic extraction ───────────────────────► keyword match → authorTopicMap (10 buckets, sorted by count)
 │
 ▼
Gemini Embeddings ──── Promise.all ────► embed globalContext snippets (2)
 │                                        embed authorContext snippets (2, indexed)
 ├── centroid(globalEmbeds)
 ├── centroid(authorEmbeds)
 ├── divergenceScore = (1 − cosineSimilarity) × 100
 └── top-5 author articles by distance from globalCentroid
 │
 ▼
OpenRouter / Llama 3.3 70B ─────────────► ownership summary + author pattern + contrast analysis
 │
 ▼
Bias alert rules ───────────────────────► 0–3 alerts (deterministic, no AI):
 ├── CONFLICT_OF_INTEREST (HIGH)   — author never criticized owner
 ├── NARRATIVE_ISOLATION (MEDIUM)  — divergence score > 70
 └── MEDIA_CONCENTRATION (LOW)     — owner controls 3+ outlets
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
| SerpApi (401 / timeout) | Returns `[]`, pipeline continues |
| Wikidata (no result / timeout) | Returns `{ chain: [], summary: "Not found" }` |
| DuckDuckGo (timeout) | Returns empty bio and articles |
| OpenRouter (401 / timeout / empty response) | Returns `"Not available"` for all LLM fields |
| Gemini Embeddings (no key / timeout) | Returns `{ score: null, divergentSources: [] }` — never returns a false 100.0 |
| Topic extraction | Pure function, no external call — cannot fail |
| Bias alert rules | Pure function, no external call — returns `[]` if no rules fire |
