# Huginn — Media Intelligence

Paste a news article URL and Huginn tells you who owns the outlet, what the author has covered before, and what an AI thinks about the relationship between the two.

## What it does

Three layers of analysis, in order:

**Layer 1 — The Outlet**
Who owns the media company that published the article. Ownership chain traversed up to 3 levels via Wikidata SPARQL (e.g. CNN → Warner Bros. Discovery).

**Layer 2 — The Author**
Author biography and coverage history pulled from DuckDuckGo Instant Answer API and SerpApi Google News. Shows patterns in how the author has covered similar topics.

**Layer 3 — The Contrast**
AI-generated analysis (via OpenRouter + Llama 3.3 70B) that connects the ownership chain, the author's history, and the current article's framing.

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

## Project structure

```
src/
├── app/
│   ├── _components/
│   │   └── AnalyzerForm.tsx   # Client component — URL input + results UI
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
│   └── utils.ts               # cn() + fetchWithTimeout()
└── types/
    └── analysis.ts            # All TypeScript interfaces
testsprite_tests/              # AI-generated test cases (TestSprite)
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
    "content": "string (first 500 chars)"
  },
  "ownership": {
    "chain": ["CNN", "Warner Bros. Discovery"],
    "summary": "string"
  },
  "authorHistory": {
    "bio": "string",
    "articles": [{ "title": "", "source": "", "snippet": "", "link": "" }],
    "pattern": "string"
  },
  "contrast": {
    "analysis": "string"
  },
  "raw": {
    "globalContext": [],
    "authorContext": []
  }
}
```

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
Wikidata SPARQL ────────────────────────► ownership chain (up to 3 levels)
 │
 ▼
SerpApi + DuckDuckGo ──── Promise.all ──► global context (20) + author history (10)
 │                                        author bio (DDG, no key required)
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
```

DuckDuckGo and Wikidata require no API keys.

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

## Resilience

| Integration | Failure behavior |
|-------------|-----------------|
| Postlight Parser | Falls back to OG meta tag extraction |
| SerpApi (401 / timeout) | Returns empty arrays, pipeline continues |
| Wikidata (no result / timeout) | Returns `{ chain: [], summary: "No encontrado" }` |
| DuckDuckGo (timeout) | Returns empty bio and articles |
| OpenRouter (401 / timeout) | Returns `"No disponible"` strings for all LLM fields |
