export function interpretDivergence(score: number): string {
  if (score <= 20) return "Author aligns with the global consensus on this topic";
  if (score <= 40) return "Slight narrative divergence detected";
  if (score <= 60) return "Moderate divergence — author covers this topic differently from the consensus";
  if (score <= 80) return "High narrative divergence — clearly differentiated perspective";
  return "Isolated narrative — author diverges significantly from the global consensus";
}
