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
    console.error(`MBFC API error: ${response.status}`);
    cache = new Map();
    return cache;
  }

  const data: unknown = await response.json();
  const records: MBFCRecord[] = Array.isArray(data) ? data : [];

  cache = new Map(
    records
      .filter((r) => r["Source URL"])
      .map((r) => [normalizeDomain(r["Source URL"]), r]),
  );

  return cache;
}

export async function getMBFCRating(domain: string): Promise<MBFCRating | null> {
  if (!process.env.MBFC_API_KEY) return null;

  try {
    const map = await loadCache();
    const record = map.get(normalizeDomain(domain));
    if (!record) return null;

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
