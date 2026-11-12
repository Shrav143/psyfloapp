/* The PDF uses the standard Helvetica and Times fonts, which only draw the WinAnsi characters (Latin-1 plus a few typographic marks).
   Anything else would come out as a wrong letter or a blank, so it is replaced with plain ASCII before it is drawn. */

const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

const REPLACE: Record<string, string> = {
  " ": " ", "­": "", " ": " ", " ": " ", " ": " ", " ": " ", " ": " ", "​": "", " ": " ", " ": " ", " ": " ",
  "‐": "-", "‑": "-", "‒": "-", "―": "-", "−": "-", "⁃": "-",
  "←": "<-", "→": "->", "↔": "<->", "⇒": "=>",
  "≤": "<=", "≥": ">=", "≈": "~", "≠": "!=", "∞": "unlimited",
  "✓": "x", "✔": "x", "✗": "x", "✘": "x", "☐": "[ ]", "☑": "[x]",
  "′": "'", "″": '"', "●": "*", "○": "o", "‣": ">",
  "\t": " ",
};

const allowed = (ch: string): boolean => {
  const c = ch.charCodeAt(0);
  return ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
};

/** Text that the built-in PDF fonts can draw. Accented letters that are not in WinAnsi lose the accent; symbols with no match are dropped. */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch in REPLACE) out += REPLACE[ch];
    else if (allowed(ch)) out += ch;
    else out += ch.normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
  }
  return out;
}
