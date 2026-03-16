# Product Requirements Document (PRD)

## 1. Product Overview

**Product name:** Huginn - Media Intelligence

Huginn is a web app where users paste a news article URL and receive a multi-layer analysis that combines:
- media ownership mapping,
- author coverage behavior,
- narrative divergence scoring,
- deterministic bias alerts.

The system aggregates structured signals from Wikidata, SerpApi, DuckDuckGo, MBFC, and AI models (OpenRouter + Gemini embeddings) to help users understand potential editorial pressures and framing differences.

## 2. Problem Statement

Most readers consume news without visibility into:
- who ultimately owns the outlet,
- whether the author consistently frames topics in a narrow way,
- how that framing compares against broader global coverage.

This creates an interpretation gap: users can read facts but miss structural context (ownership and narrative patterns) that influences trust and perspective.

## 3. Goals

### Primary Goals
- Let a user analyze a single article URL in one flow.
- Return a readable, structured report with ownership + authorship + contrast.
- Quantify narrative divergence using a reproducible vector method.
- Surface deterministic alerts independent from LLM output.

### Secondary Goals
- Keep the pipeline resilient when external providers fail.
- Provide transparent raw context for auditing.
- Keep response latency reasonable using parallelized calls.

## 4. Non-Goals

- Real-time crawling or continuous outlet monitoring.
- Full article fact-checking and claim verification.
- Political stance classification for all outlets globally.
- User accounts, saved reports, or collaboration workflows.

## 5. Target Users

- **Journalists and editors:** quick context on ownership and coverage patterns.
- **Researchers and students:** media framing analysis inputs.
- **Policy/news readers:** transparency layer before sharing or citing content.

## 6. Core User Journey

1. User opens homepage.
2. User pastes a valid article URL.
3. User submits form.
4. Backend executes analysis pipeline.
5. UI shows layered report:
   - Layer 1: outlet + ownership chain (+ MBFC if available)
   - Layer 2: author bio + coverage history
   - Layer 2.5: author topic map (tree + distribution)
   - Layer 3: LLM contrast analysis
   - Layer 4: narrative divergence score and top divergent sources
   - Alerts: deterministic bias alerts (if any)
6. User can inspect raw JSON for transparency.

## 7. Functional Requirements

### FR-1 URL Input and Validation
- The UI must accept a URL via a form field.
- Backend must reject missing URL with `400` and error message.
- Backend must reject malformed URL with `400` and error message.

### FR-2 Article Extraction
- System must extract `title`, `author`, `domain`, and content preview.
- Primary extractor: Postlight Parser.
- Fallback extractor: direct HTML OG/meta parsing when needed.

### FR-3 Ownership Analysis
- System must infer outlet ownership chain from Wikidata.
- Chain traversal depth must be up to 3 ownership levels.
- Output must include chain summary + outlet/owner bios from DuckDuckGo.

### FR-4 Author Analysis
- System must fetch author biography context from DuckDuckGo.
- System must fetch author-related articles from SerpApi and DuckDuckGo.
- Results must be merged and deduplicated by URL.

### FR-5 Author Topic Map
- System must run dedicated author-name query and merge results.
- System must classify articles into keyword-based topic buckets.
- UI must display grouped topics with expandable article lists and a bar distribution view.

### FR-6 Contrast Analysis (LLM)
- System must produce structured JSON with:
  - ownership summary,
  - author pattern,
  - contrast analysis.
- If LLM request fails, response must degrade to `"Not available"` fields.

### FR-7 Narrative Divergence
- System must compute embeddings for selected global and author snippets.
- System must compute centroid distance and return score (0-100 style output).
- System must return top divergent author sources ranked by distance.
- If embeddings are unavailable, score must be `null` and interpretation `"Not available"`.

### FR-8 Bias Alerts Engine
- System must generate deterministic alerts:
  - `CONFLICT_OF_INTEREST` (HIGH)
  - `NARRATIVE_ISOLATION` (MEDIUM)
  - `MEDIA_CONCENTRATION` (LOW)
- Alerts must be sorted by severity HIGH -> MEDIUM -> LOW.

### FR-9 API Contract
- Endpoint: `POST /api/analyze`
- Request shape: `{ "url": "https://..." }`
- Response shape must match `AnalysisResponse` contract used by frontend.
- Pipeline should return successful partial data where possible instead of hard-failing.

### FR-10 Frontend Result Rendering
- UI must show loading, success, and error states.
- UI must render all analysis layers and metrics cards.
- UI must include outbound links for source inspection.
- UI must include raw JSON expandable section.

## 8. Non-Functional Requirements

### NFR-1 Resilience
- External integrations must use timeouts.
- Failure of one provider must not crash entire pipeline.
- API should still return a coherent response with fallback fields.

### NFR-2 Performance
- Independent data sources should run in parallel via `Promise.all`.
- Initial version targets practical responsiveness for single-URL analyses.

### NFR-3 Maintainability
- Strict TypeScript interfaces must define response boundaries.
- Analysis logic must remain modular by provider/domain concern.

### NFR-4 Transparency
- Expose raw contexts and rule-based alerts to support user auditability.

## 9. External Dependencies and Configuration

### Required Environment Variables
- `SERPAPI_KEY`
- `OPENROUTER_API_KEY`
- `GOOGLE_AI_API_KEY` (required for divergence score)

### Optional Environment Variable
- `MBFC_API_KEY` (if missing, MBFC rating is omitted)

### Third-Party Services
- SerpApi (Google News)
- OpenRouter (LLM report)
- Google AI Gemini embeddings
- Wikidata SPARQL endpoint
- DuckDuckGo Instant Answer API
- RapidAPI MBFC dataset endpoint

## 10. Success Metrics

### Product Metrics
- % of submitted URLs that return a complete response object.
- % of analyses with non-null divergence score.
- Median end-to-end analysis time.

### Quality Metrics
- Ownership chain match rate on sampled known outlets.
- Topic classification usefulness (manual reviewer spot checks).
- Alert precision in curated test cases.

## 11. Risks and Mitigations

- **Risk:** External API outages or quota limits.
  - **Mitigation:** timeout + graceful fallback paths already built.
- **Risk:** Inconsistent extraction quality on heavily protected sites.
  - **Mitigation:** parser fallback to OG/meta tags.
- **Risk:** LLM variability.
  - **Mitigation:** constrained JSON response format + deterministic alert layer.
- **Risk:** Domain normalization mismatches (MBFC and Wikidata lookup gaps).
  - **Mitigation:** maintain normalization logic and expand matching heuristics.

## 12. Future Enhancements

- Add persistent analysis history and report export.
- Add side-by-side comparison between multiple outlets on same event.
- Add configurable topic taxonomy and multilingual keyword sets.
- Add confidence indicators per layer.
- Add automated evaluation suite for alert and divergence stability.
