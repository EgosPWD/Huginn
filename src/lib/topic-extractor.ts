import type { AuthorTopicMap, NewsResult } from "@/types/analysis";

// Ordered by priority — first match wins
const TOPIC_KEYWORDS: [string, string[]][] = [
  ["Nuclear Policy",    ["nuclear", "warhead", "nonproliferation", "atomic", "nuke", "icbm", "enrichment"]],
  ["Iran",              ["iran", "tehran", "iranian", "irgc", "persian gulf", "khamenei"]],
  ["Russia / Ukraine",  ["russia", "ukraine", "putin", "zelensky", "kremlin", "moscow", "kyiv", "russian"]],
  ["China",             ["china", "beijing", "xi jinping", "taiwan", "hong kong", "chinese military"]],
  ["Middle East",       ["israel", "gaza", "hamas", "saudi", "iraq", "syria", "palestine", "hezbollah", "netanyahu"]],
  ["National Security", ["security", "intelligence", "cia", "nsa", "espionage", "classified", "pentagon", "defense department"]],
  ["Cybersecurity",     ["cyber", "hacking", "ransomware", "malware", "breach", "surveillance tech"]],
  ["Diplomacy",         ["diplomacy", "summit", "treaty", "negotiations", "sanctions", "foreign policy", "state department"]],
  ["US Politics",       ["congress", "senate", "white house", "election", "trump", "biden", "democrat", "republican", "administration"]],
  ["Economy",           ["economy", "inflation", "gdp", "federal reserve", "trade", "tariff", "recession", "debt"]],
  ["Technology",        ["artificial intelligence", "ai model", "tech giant", "silicon valley", "semiconductor"]],
];

export function extractTopics(articles: NewsResult[]): AuthorTopicMap {
  const buckets = new Map<string, NewsResult[]>();

  for (const article of articles) {
    const text = `${article.title} ${article.snippet}`.toLowerCase();
    let matched = false;

    for (const [topic, keywords] of TOPIC_KEYWORDS) {
      if (keywords.some((kw) => text.includes(kw))) {
        if (!buckets.has(topic)) buckets.set(topic, []);
        buckets.get(topic)!.push(article);
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!buckets.has("Other")) buckets.set("Other", []);
      buckets.get("Other")!.push(article);
    }
  }

  const topics = Array.from(buckets.entries())
    .map(([topic, arts]) => ({ topic, count: arts.length, articles: arts }))
    .sort((a, b) => b.count - a.count);

  return { topics, totalArticles: articles.length };
}
