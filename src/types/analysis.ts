// --- Shared primitives ---

export interface NewsResult {
  title: string;
  source: string;
  snippet: string;
  link: string;
}

// --- Article (Postlight Parser output) ---

export interface Article {
  title: string;
  author: string;
  domain: string;
  content: string;
}

// --- Ownership (Wikidata + DDG enrichment) ---

export interface Ownership {
  chain: string[];
  summary: string;
  outletBio: string;  // DDG abstract about the outlet
  ownerBio: string;   // DDG abstract about the ultimate owner
}

// --- Author history (SerpApi + DuckDuckGo) ---

export interface AuthorHistory {
  bio: string;
  articles: NewsResult[];
  pattern: string;
}

// --- Author topic map (SerpApi dedicated author search) ---

export interface AuthorTopic {
  topic: string;
  count: number;
  articles: NewsResult[];
}

export interface AuthorTopicMap {
  topics: AuthorTopic[];
  totalArticles: number;
}

// --- DuckDuckGo Instant Answer API ---

export interface DDGRelatedTopic {
  Text?: string;
  FirstURL?: string;
  Result?: string;
  Topics?: DDGRelatedTopic[];
  Name?: string;
}

export interface DDGResponse {
  Abstract: string;
  AbstractText: string;
  AbstractSource: string;
  AbstractURL: string;
  RelatedTopics: DDGRelatedTopic[];
  Results: DDGRelatedTopic[];
  Type: string;
}

// --- Contrast (OpenRouter) ---

export interface Contrast {
  analysis: string;
}

// --- Full LLM report shape ---

export interface LLMReport {
  ownershipSummary: string;
  authorPattern: string;
  contrastAnalysis: string;
}

// --- Raw search context ---

export interface RawContext {
  globalContext: NewsResult[];
  authorContext: NewsResult[];
  topicContext: NewsResult[];   // DDG topic fallback
  outletContext: NewsResult[];  // DDG outlet/owner related links
}

// --- Narrative Divergence Score ---

export interface DivergentSource {
  title: string;
  source: string;
  link: string;
  snippet: string;
  divergenceScore: number;
}

export interface NarrativeDivergence {
  score: number | null;
  interpretation: string;
  globalSnippetsCount: number;
  authorSnippetsCount: number;
  divergentSources: DivergentSource[];
}

// --- Bias Alerts ---

export type AlertLevel = "HIGH" | "MEDIUM" | "LOW";
export type AlertCode = "CONFLICT_OF_INTEREST" | "NARRATIVE_ISOLATION" | "MEDIA_CONCENTRATION";

export interface Alert {
  level: AlertLevel;
  code: AlertCode;
  message: string;
}

// --- MBFC (Media Bias Fact Check) rating ---

export interface MBFCRating {
  bias: string;
  factualReporting: string;
  credibility: string;
  country: string;
  sourceName: string;
}

// --- Full analysis response ---

export interface AnalysisResponse {
  article: Article;
  ownership: Ownership;
  authorHistory: AuthorHistory;
  contrast: Contrast;
  narrativeDivergence: NarrativeDivergence;
  alerts: Alert[];
  raw: RawContext;
  authorTopicMap: AuthorTopicMap;
  mbfc: MBFCRating | null;
}

// --- API request ---

export interface AnalyzeRequest {
  url: string;
}

// --- SerpApi internal response shape ---

export interface SerpApiSource {
  name?: string;
  authors?: string[];
}

export interface SerpApiNewsItem {
  title?: string;
  source?: SerpApiSource;
  snippet?: string;
  link?: string;
}

export interface SerpApiResponse {
  news_results?: SerpApiNewsItem[];
}

// --- Wikidata SPARQL result shapes ---

export interface WikidataBinding {
  value: string;
  type: string;
}

export interface WikidataRow {
  item?: WikidataBinding;
  itemLabel?: WikidataBinding;
  ownerLabel?: WikidataBinding;
}

export interface WikidataResults {
  results: {
    bindings: WikidataRow[];
  };
}
