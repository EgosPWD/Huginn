import type { Alert, AlertLevel, AnalysisResponse } from "@/types/analysis";

const SEVERITY_ORDER: Record<AlertLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// Rule 1: Author never criticized the owner
// Triggers if there's a parent company AND none of the author's articles
// mention the owner with critical language.
function authorNeverCriticizedOwner(analysis: AnalysisResponse): boolean {
  const { ownership, authorHistory } = analysis;

  if (ownership.chain.length < 2 || authorHistory.articles.length === 0) return false;

  const owner = ownership.chain[ownership.chain.length - 1].toLowerCase();
  const criticalKeywords = ["criticiz", "attack", "condemn", "against", "oppos", "scandal", "controver"];

  const hasCriticism = authorHistory.articles.some((a) => {
    const text = `${a.title} ${a.snippet}`.toLowerCase();
    return text.includes(owner) && criticalKeywords.some((kw) => text.includes(kw));
  });

  return !hasCriticism;
}

// Rule 3: Owner controls 3+ outlets
// Proxy: count known media brand mentions in the owner's DDG bio.
function ownerControls3PlusOutlets(analysis: AnalysisResponse): boolean {
  const { ownership } = analysis;

  if (ownership.chain.length < 2) return false;

  const mediaOutlets = [
    "cnn", "hbo", "tbs", "nbc", "abc", "cbs", "fox", "msnbc", "espn",
    "bbc", "warner", "disney", "comcast", "viacom", "news corp",
    "turner", "cartoon network", "tnt", "trutv", "max",
  ];

  const ownerText = ownership.ownerBio.toLowerCase();
  const mentioned = mediaOutlets.filter((outlet) => ownerText.includes(outlet));

  return mentioned.length >= 3;
}

export function generateAlerts(analysis: AnalysisResponse): Alert[] {
  const alerts: Alert[] = [];

  // Rule 1: Conflict of interest — HIGH
  if (authorNeverCriticizedOwner(analysis)) {
    alerts.push({
      level: "HIGH",
      code: "CONFLICT_OF_INTEREST",
      message: "The author has never criticized the outlet's owner",
    });
  }

  // Rule 2: Narrative isolation — MEDIUM (score strictly > 70)
  if (analysis.narrativeDivergence.score !== null && analysis.narrativeDivergence.score > 70) {
    alerts.push({
      level: "MEDIUM",
      code: "NARRATIVE_ISOLATION",
      message: "The author diverges significantly from the global consensus",
    });
  }

  // Rule 3: Media concentration — LOW
  if (ownerControls3PlusOutlets(analysis)) {
    alerts.push({
      level: "LOW",
      code: "MEDIA_CONCENTRATION",
      message: "The owner controls multiple relevant media outlets",
    });
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.level] - SEVERITY_ORDER[b.level]);
}
