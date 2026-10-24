export const pct = (n: number): string => `${Math.round(n)}%`;
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
/** Approval-chance bands used everywhere: Strong 80+, Moderate 55-79, At risk below 55. */
export function band(p: number): { word: "Strong" | "Moderate" | "At risk"; tone: "good" | "mid" | "risk"; color: string } {
  if (p >= 80) return { word: "Strong", tone: "good", color: "#2F6F5C" };
  if (p >= 55) return { word: "Moderate", tone: "mid", color: "#8F6620" };
  return { word: "At risk", tone: "risk", color: "#B5553A" };
}
let seq = 1000;
export const uid = (prefix = "id"): string => `${prefix}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
export const initialsOf = (name: string): string =>
  name.split(/\s+/).filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join("");
