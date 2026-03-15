import "server-only";
import { fetchWithTimeout } from "@/lib/utils";
import type { Ownership, WikidataResults } from "@/types/analysis";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = {
  "User-Agent": "Huginn/1.0 (media analysis tool; huginn@example.com)",
  Accept: "application/sparql-results+json",
};
const WIKIDATA_TIMEOUT_MS = 8_000;

// Domains are RFC-compliant: only alphanumeric, dots, hyphens
// Strip anything else before injecting into SPARQL string literals
function sanitizeDomain(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9.\-]/g, "");
}

// edition.cnn.com → cnn.com | cnnespanol.cnn.com → cnn.com | bbc.co.uk → bbc.co.uk
function extractRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;

  // Handle two-part TLDs: co.uk, com.ar, org.ar, etc.
  const twoPartTLDs = new Set(["co.uk", "com.ar", "org.ar", "net.ar", "com.mx", "co.jp"]);
  const lastTwo = parts.slice(-2).join(".");
  if (twoPartTLDs.has(lastTwo)) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

async function sparqlQuery<T>(query: string): Promise<T | null> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  try {
    const response = await fetchWithTimeout(
      url,
      { headers: HEADERS },
      WIKIDATA_TIMEOUT_MS,
    );
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function findEntityByDomain(domain: string): Promise<string | null> {
  // Try exact domain first, then root domain — both sanitized
  const candidates = [domain, extractRootDomain(domain)]
    .map(sanitizeDomain)
    .filter((d, i, arr) => d && arr.indexOf(d) === i); // dedup + remove empty

  for (const candidate of candidates) {
    const query = `
      SELECT ?item WHERE {
        ?item wdt:P856 ?website .
        FILTER(CONTAINS(LCASE(STR(?website)), "${candidate}"))
        ?item wdt:P31/wdt:P279* wd:Q1193236 .
      }
      LIMIT 1
    `;

    const data = await sparqlQuery<WikidataResults>(query);
    const entityId = data?.results?.bindings?.[0]?.item?.value?.split("/").pop();
    if (entityId) return entityId;

    // Fallback: less strict — any entity with that website
    const fallbackQuery = `
      SELECT ?item WHERE {
        ?item wdt:P856 ?website .
        FILTER(CONTAINS(LCASE(STR(?website)), "${candidate}"))
      }
      LIMIT 1
    `;

    const fallbackData = await sparqlQuery<WikidataResults>(fallbackQuery);
    const fallbackId = fallbackData?.results?.bindings?.[0]?.item?.value?.split("/").pop();
    if (fallbackId) return fallbackId;
  }

  return null;
}

async function getEntityLabel(entityId: string): Promise<string | null> {
  // Use ?itemLabel to match WikidataRow type
  const query = `
    SELECT ?itemLabel WHERE {
      wd:${entityId} rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en" || LANG(?itemLabel) = "es")
    }
    LIMIT 1
  `;

  const data = await sparqlQuery<WikidataResults>(query);
  return data?.results?.bindings?.[0]?.itemLabel?.value ?? null;
}

async function getOwner(entityId: string): Promise<string | null> {
  const query = `
    SELECT ?ownerLabel WHERE {
      wd:${entityId} wdt:P127|wdt:P749 ?owner .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 1
  `;

  const data = await sparqlQuery<WikidataResults>(query);
  return data?.results?.bindings?.[0]?.ownerLabel?.value ?? null;
}

async function getOwnerEntityId(entityId: string): Promise<string | null> {
  const query = `
    SELECT ?owner WHERE {
      wd:${entityId} wdt:P127|wdt:P749 ?owner .
    }
    LIMIT 1
  `;

  interface OwnerResult {
    results: { bindings: Array<{ owner?: { value: string } }> };
  }

  const data = await sparqlQuery<OwnerResult>(query);
  return (
    data?.results?.bindings?.[0]?.owner?.value?.split("/").pop() ?? null
  );
}

const EMPTY_OWNERSHIP: Ownership = {
  chain: [],
  summary: "Not found in Wikidata",
  outletBio: "",
  ownerBio: "",
};

export async function buildOwnershipChain(domain: string): Promise<Ownership> {
  try {
    const entityId = await findEntityByDomain(domain);
    if (!entityId) return EMPTY_OWNERSHIP;

    const mediaLabel = (await getEntityLabel(entityId)) ?? extractRootDomain(domain);
    const chain: string[] = [mediaLabel];
    let currentId = entityId;

    for (let level = 0; level < 3; level++) {
      const ownerLabel = await getOwner(currentId);
      if (!ownerLabel) break;
      chain.push(ownerLabel);

      const nextId = await getOwnerEntityId(currentId);
      if (!nextId) break;
      currentId = nextId;
    }

    const summary =
      chain.length > 1
        ? `${chain[0]} is owned by ${chain[chain.length - 1]} (chain: ${chain.join(" → ")})`
        : `${chain[0]} — owner not found`;

    // outletBio and ownerBio are filled later by DDG enrichment in route.ts
    return { chain, summary, outletBio: "", ownerBio: "" };
  } catch {
    return { ...EMPTY_OWNERSHIP, summary: "Error querying Wikidata" };
  }
}
