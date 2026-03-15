# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata

| Field           | Value                          |
|-----------------|--------------------------------|
| **Project**     | Huginn — Inteligencia Mediática |
| **Date**        | 2026-03-15                     |
| **Prepared by** | TestSprite AI + Claude Code    |
| **Test Type**   | Backend API                    |
| **Endpoint**    | POST /api/analyze              |
| **Pass Rate**   | 85.71% (6/7 passed → fixed to 7/7) |

---

## 2️⃣ Requirement Validation Summary

### Requirement A — Core Analysis Pipeline

| Test | Description | Status |
|------|-------------|--------|
| TC001 | POST /api/analyze with valid URL returns full analysis response | ✅ Passed |
| TC006 | Postlight parser partial extraction falls back to OG meta tags | ✅ Passed |

**Findings:** The full pipeline (Postlight → Wikidata → SerpApi+DDG → OpenRouter) completes successfully for valid URLs. OG meta fallback works correctly for sites with client-side rendering like CNN.

---

### Requirement B — Input Validation

| Test | Description | Status |
|------|-------------|--------|
| TC002 | Missing URL / empty body / empty string returns 400 | ❌ Failed → **Fixed** |

**Root Cause:** `request.json()` throws a `SyntaxError` when the HTTP body is completely absent (no Content-Type, no body). This was caught by the outer `try/catch` and returned a generic 500 instead of 400.

**Fix applied in `src/app/api/analyze/route.ts`:**
- Extracted `request.json()` into its own try/catch block at the top level
- A parse failure now returns `{ error: "URL requerida" }` with status 400
- Added `.trim()` to also catch whitespace-only URL strings

---

### Requirement C — Graceful Degradation (External APIs)

| Test | Description | Status |
|------|-------------|--------|
| TC003 | Missing SERPAPI_KEY returns 200 with empty arrays (not 500) | ✅ Passed |
| TC004 | Wikidata SPARQL returning no results returns 200 with empty chain | ✅ Passed |
| TC005 | Missing OPENROUTER_API_KEY returns 200 with fallback strings | ✅ Passed |

**Findings:** All three external API integrations fail gracefully. No key = empty/fallback data, never a 500.

---

### Requirement D — Error Handling

| Test | Description | Status |
|------|-------------|--------|
| TC007 | Unexpected server-side error returns 500 with error message | ✅ Passed |

**Findings:** The outer try/catch correctly returns 500 for unexpected runtime errors.

---

## 3️⃣ Coverage & Matching Metrics

| Requirement                    | Total Tests | ✅ Passed | ❌ Failed |
|-------------------------------|-------------|-----------|----------|
| A — Core Analysis Pipeline    | 2           | 2         | 0        |
| B — Input Validation          | 1           | 0 → 1*    | 1 → 0*   |
| C — Graceful Degradation      | 3           | 3         | 0        |
| D — Error Handling            | 1           | 1         | 0        |
| **TOTAL**                     | **7**       | **6→7***  | **1→0*** |

*After fix applied.

- **Pre-fix pass rate:** 85.71% (6/7)
- **Post-fix pass rate:** 100% (7/7)

---

## 4️⃣ Key Gaps / Risks

| # | Gap / Risk | Severity | Location |
|---|-----------|----------|----------|
| 1 | **No timeout on external API calls** — Postlight, Wikidata, SerpApi, OpenRouter have no `AbortController` timeout. A hanging external call blocks the route indefinitely. | High | `src/lib/*.ts` |
| 2 | **Wikidata query uses string interpolation** — domain name is injected directly into SPARQL (`"${domain}"`). A domain containing `"` could break the query. | Medium | `src/lib/wikidata.ts` |
| 3 | **No test for invalid URL format** — e.g. `{ url: "not-a-url" }` should return 400. Currently covered in code but not tested. | Low | `src/app/api/analyze/route.ts` |
| 4 | **DuckDuckGo returns sparse results for non-famous authors** — no fallback beyond empty array. Consider Wikipedia API as secondary source. | Low | `src/lib/duckduckgo.ts` |
| 5 | **`body.url` typed as `string` after Partial check** — after narrowing `!body.url?.trim()`, TypeScript still sees `body.url` as `string \| undefined` without explicit assertion. Non-blocking but worth refining. | Low | `src/app/api/analyze/route.ts` |
