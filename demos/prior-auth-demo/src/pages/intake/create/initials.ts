/** "tw", "T W" or "T.W." become "T.W." A typed name becomes its initials: names appear as initials and age (privacy mode). */
export function normInitials(raw: string): string {
  const t = raw.trim();
  const letters = /\s/.test(t) && t.replace(/[^A-Za-z\s]/g, "").split(/\s+/).every((w) => w.length > 1) ? t.split(/\s+/).map((w) => w[0]) : t.replace(/[^A-Za-z]/g, "").split("");
  return letters.slice(0, 3).map((c) => c.toUpperCase()).join(".") + (letters.length ? "." : "");
}
