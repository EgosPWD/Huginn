import "server-only";
import { fetchWithTimeout } from "@/lib/utils";
import type { MBFCRating } from "@/types/analysis";

const MBFC_TIMEOUT_MS = 8_000;

interface MBFCRecord {
  Source: string;
  Bias: string;
  "Factual Reporting": string;
  Credibility: string;
  Country: string;
  "Source URL": string;
}

// Module-level cache — populated once per server process lifetime
let cache: Map<string, MBFCRecord> | null = null;

function normalizeDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

async function loadCache(): Promise<Map<string, MBFCRecord>> {
  if (cache) return cache;

  const response = await fetchWithTimeout(
    "https://media-bias-fact-check-ratings-api2.p.rapidapi.com/fetch-data",
    {
      headers: {
        "X-RapidAPI-Key": process.env.MBFC_API_KEY!,
        "X-RapidAPI-Host": "media-bias-fact-check-ratings-api2.p.rapidapi.com",
      },
    },
    MBFC_TIMEOUT_MS,
  );

  if (!response.ok) {
    console.error(`[MBFC] API error: ${response.status} — not caching, will retry next request`);
    return new Map();
  }

  const data: unknown = await response.json();

  // Debug: log shape so we can see what the API actually returns
  if (Array.isArray(data)) {
    console.log(`[MBFC] Loaded ${data.length} records (array). First record:`, JSON.stringify(data[0]));
  } else if (data && typeof data === "object") {
    console.log(`[MBFC] Response is object, keys:`, Object.keys(data as object));
  } else {
    console.log(`[MBFC] Unexpected response type:`, typeof data);
  }

  // Support both a top-level array and a wrapped { data: [...] } shape
  let records: MBFCRecord[] = [];
  if (Array.isArray(data)) {
    records = data as MBFCRecord[];
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const nested = Object.values(obj).find(Array.isArray);
    if (nested) records = nested as MBFCRecord[];
  }

  cache = new Map(
    records
      .filter((r) => r["Source URL"])
      .map((r) => [normalizeDomain(r["Source URL"]), r]),
  );

  console.log(`[MBFC] Cache built with ${cache.size} entries`);
  return cache;
}

export async function getMBFCRating(domain: string): Promise<MBFCRating | null> {
  if (!process.env.MBFC_API_KEY) return null;

  try {
    const map = await loadCache();
    const normalized = normalizeDomain(domain);
    console.log(`[MBFC] Looking up "${normalized}" in cache (${map.size} entries)`);
    const record = map.get(normalized);
    if (!record) {
      console.log(`[MBFC] No match for "${normalized}"`);
      return null;
    }

    return {
      bias: record.Bias ?? "",
      factualReporting: record["Factual Reporting"] ?? "",
      credibility: record.Credibility ?? "",
      country: record.Country ?? "",
      sourceName: record.Source ?? "",
    };
  } catch {
    return null;
  }
}
