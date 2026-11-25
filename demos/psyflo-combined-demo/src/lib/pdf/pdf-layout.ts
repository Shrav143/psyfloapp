import type { jsPDF } from "jspdf";
import { pdfSafe } from "./pdf-text";

/* A small flow layout on top of jsPDF: every piece of the report becomes "ops" (a height and a draw function) and `flow` places them
   on pages. That is where the page-break rules live: a heading is never alone at the bottom of a page, a paragraph never leaves a
   single line behind, and a block that fits on a page is kept in one piece. Units are points; the page is US Letter. */

export const PAGE = { w: 612, h: 792, margin: 54 };

export interface Style {
  font: "helvetica" | "times";
  weight: "normal" | "bold" | "italic" | "bolditalic";
  size: number;
  color: string;
  /** Line height. Defaults to 1.4 times the size. */
  lh?: number;
  /** Extra space between letters, for small capital labels. */
  track?: number;
}

export interface Op {
  h: number;
  draw: (y: number) => void;
  /** Blank space. It is dropped at the top of a page. */
  gap?: boolean;
}

export class Writer {
  y: number = PAGE.margin;
  readonly top = PAGE.margin;
  readonly bottom = PAGE.h - PAGE.margin;
  readonly left = PAGE.margin;
  readonly width = PAGE.w - 2 * PAGE.margin;

  constructor(readonly pdf: jsPDF) {}

  apply(s: Style): void {
    this.pdf.setFont(s.font, s.weight);
    this.pdf.setFontSize(s.size);
    this.pdf.setTextColor(s.color);
  }

  textWidth(text: string, s: Style): number {
    this.apply(s);
    return this.pdf.getTextWidth(pdfSafe(text)) + (s.track ?? 0) * pdfSafe(text).length;
  }

  /** Wraps a little short of the full width: a viewer that swaps in its own Helvetica draws the text up to half a percent wider than jsPDF measures it. */
  wrap(text: string, s: Style, width: number): string[] {
    this.apply(s);
    return this.pdf.splitTextToSize(pdfSafe(text), width * 0.99) as string[];
  }

  /** Draws one line of text with its top at `y`. */
  put(text: string, s: Style, x: number, y: number, align: "left" | "right" | "center" = "left"): void {
    const lh = s.lh ?? s.size * 1.4;
    this.apply(s);
    this.pdf.text(pdfSafe(text), x, y + (lh - s.size) / 2 + s.size * 0.8, { align, charSpace: s.track ?? 0 });
  }

  gap(h: number): Op {
    return { h, draw: () => undefined, gap: true };
  }

  /** One op per wrapped line. `deco` draws something behind a line (a quote bar). */
  lines(text: string, s: Style, x: number, width: number, deco?: (y: number, h: number) => void): Op[] {
    const lh = s.lh ?? s.size * 1.4;
    return this.wrap(text, s, width).map((row) => ({
      h: lh,
      draw: (y) => {
        deco?.(y, lh);
        this.put(row, s, x, y);
      },
    }));
  }

  /** Wraps `text` so that the first line is shorter (it starts after a tag), the rest use the full width. */
  wrapAfter(text: string, s: Style, firstWidth: number, width: number): { first: string; rest: string[] } {
    const firstRows = this.wrap(text, s, firstWidth);
    const first = firstRows[0] ?? "";
    const remainder = pdfSafe(text).slice(first.length).trim();
    return { first, rest: remainder ? this.wrap(remainder, s, width) : [] };
  }

  /** Several ops that stay together on one page when they fit in most of a page; a block that is longer than that flows on its own. */
  keep(ops: Op[]): Op[] {
    const h = ops.reduce((a, o) => a + o.h, 0);
    if (h > (this.bottom - this.top) * 0.7) return ops;
    return [{ h, draw: (y) => ops.reduce((yy, o) => (o.draw(yy), yy + o.h), y) }];
  }

  newPage(): void {
    this.pdf.addPage();
    this.y = this.top;
  }

  /** Places ops on pages. `head` is how many ops must fit on the page together before the first break (so a heading keeps some text under it). */
  flow(ops: Op[], head = 2): void {
    let i = 0;
    while (i < ops.length) {
      if (this.y <= this.top + 0.5) while (i < ops.length && ops[i].gap) i += 1;
      if (i >= ops.length) return;
      let y = this.y;
      let j = i;
      while (j < ops.length && y + ops[j].h <= this.bottom + 0.01) {
        y += ops[j].h;
        j += 1;
      }
      if (j < ops.length) {
        if (j - i < Math.min(head, ops.length - i) && this.y > this.top + 0.5) {
          this.newPage();
          continue;
        }
        if (ops.length - j === 1 && j - i >= 3) j -= 1;
      }
      if (j === i) j = i + 1; // a block taller than a page is drawn where it is rather than looping
      for (let k = i; k < j; k += 1) {
        ops[k].draw(this.y);
        this.y += ops[k].h;
      }
      i = j;
      if (i < ops.length) this.newPage();
    }
  }
}
