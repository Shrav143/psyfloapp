import { PAGE, Writer, type Op, type Style } from "./pdf-layout";
import { REPORT_FOOTER, REPORT_HEADINGS as H, REPORT_TITLE, type ReportDoc, type ReportTone } from "./report-doc";

/* The appeal analysis report as a PDF: US Letter, 0.75 inch margins, built-in Helvetica and Times. jsPDF is loaded only when this is called,
   so it stays out of the page until someone clicks Download PDF. */

const C = {
  forest: "#1D4F43", ink: "#1B1B19", ink2: "#4D463D", muted: "#6E6A63", line: "#E5DCD0", tile: "#FAF6F2", tileEdge: "#F0ECE4", neutralBg: "#F2EAE2", neutralInk: "#4A4239",
  good: "#2F6F5C", goodBg: "#E6F2EE", goodInk: "#27493E", mid: "#8F6620", midBg: "#F6EED6", midInk: "#7D642F", risk: "#B5553A", riskBg: "#FAF2EA", riskInk: "#6B362A", faint: "#A9A59C", white: "#FFFFFF",
};
const TONE: Record<ReportTone, { fg: string; bg: string; ink: string }> = {
  good: { fg: C.good, bg: C.goodBg, ink: C.goodInk },
  mid: { fg: C.mid, bg: C.midBg, ink: C.midInk },
  risk: { fg: C.risk, bg: C.riskBg, ink: C.riskInk },
  neutral: { fg: C.muted, bg: C.neutralBg, ink: C.neutralInk },
};

const body: Style = { font: "helvetica", weight: "normal", size: 9.5, color: C.ink, lh: 14 };
const bodyBold: Style = { ...body, weight: "bold" };
const small: Style = { ...body, size: 8.5, color: C.ink2, lh: 12.5 };
const smallBold: Style = { ...small, weight: "bold" };
const label: Style = { font: "helvetica", weight: "bold", size: 7, color: C.muted, lh: 10, track: 0.4 };
const quote: Style = { font: "times", weight: "italic", size: 10, color: C.ink2, lh: 14 };
const h2: Style = { font: "times", weight: "bold", size: 15.5, color: C.forest, lh: 20 };

const IND = 26; // text starts here, to the right of a number badge

export async function buildAppealPdf(doc: ReportDoc) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true });
  pdf.setProperties({
    title: `${REPORT_TITLE}, ${doc.id}`,
    subject: `Appeal analysis for denial ${doc.id}, ${doc.payerName}`,
    author: "Psyflo",
    creator: "Psyflo",
    keywords: "appeal analysis, denial, prior authorization",
  });
  const w = new Writer(pdf);
  const { left, width } = w;

  /* ---------- small drawing helpers ---------- */
  const tag = (text: string, x: number, y: number, tone: ReportTone, solid = false): number => {
    const s: Style = { font: "helvetica", weight: "bold", size: 6.8, color: solid ? C.white : TONE[tone].ink, lh: 10, track: 0.35 };
    const tw = w.textWidth(text.toUpperCase(), s) + 10;
    pdf.setFillColor(solid ? TONE[tone].fg : TONE[tone].bg);
    pdf.roundedRect(x, y + 1, tw, 12, 6, 6, "F");
    w.put(text.toUpperCase(), s, x + 5, y + 2);
    return tw;
  };
  const check = (x: number, y: number, size: number, color: string) => {
    pdf.setDrawColor(color);
    pdf.setLineWidth(1.3);
    pdf.setLineCap("round");
    pdf.lines([[size * 0.32, size * 0.32], [size * 0.62, -size * 0.7]], x, y + size * 0.55);
  };
  const badge = (n: number, x: number, y: number) => {
    pdf.setFillColor(C.neutralBg);
    pdf.circle(x + 8, y + 7.5, 8, "F");
    w.put(String(n), { font: "helvetica", weight: "bold", size: 8.5, color: C.ink, lh: 15 }, x + 8, y, "center");
  };
  const bullet = (x: number, y: number, lh: number) => {
    pdf.setFillColor(C.muted);
    pdf.circle(x + 3, y + lh / 2, 1.5, "F");
  };
  const rule = (y: number, x1 = left, x2 = left + width, color = C.line) => {
    pdf.setDrawColor(color);
    pdf.setLineWidth(0.6);
    pdf.line(x1, y, x2, y);
  };

  /* ---------- sections ---------- */
  const heading = (text: string): Op[] => [
    w.gap(20),
    { h: 22, draw: (y) => { w.put(text, h2, left, y); rule(y + 21); } },
    w.gap(8),
  ];
  /** How many ops must stay with the heading: up to two lines of text, or the first block, with any sub line before it. */
  const headOps = (content: Op[]): number => {
    let n = 0;
    let solid = 0;
    for (const o of content) {
      n += 1;
      if (o.gap) continue;
      solid += 1;
      if (o.h >= 30 || solid >= 2) break;
    }
    return 3 + n;
  };
  const section = (title: string, content: Op[]) => w.flow([...heading(title), ...content], headOps(content));
  const para = (text: string, x = left, width2 = width, s: Style = body): Op[] => w.lines(text, s, x, width2);
  const paras = (list: string[]): Op[] => list.flatMap((t, i) => (i ? [w.gap(7), ...para(t)] : para(t)));
  const bullets = (items: string[], s: Style = body): Op[] =>
    items.flatMap((t) => {
      const rows = w.lines(t, s, left + 14, width - 14);
      rows[0] = { ...rows[0], draw: ((orig) => (y: number) => { bullet(left + 2, y, s.lh ?? 14); orig(y); })(rows[0].draw) };
      return [...rows, w.gap(3)];
    });

  /* ---------- page one: title band, facts, verdict ---------- */
  pdf.setFillColor(C.forest);
  pdf.rect(0, 0, PAGE.w, 118, "F");
  w.put("PSYFLO  ·  DENIAL INTELLIGENCE", { font: "helvetica", weight: "bold", size: 8, color: "#CFE3DB", lh: 12, track: 0.6 }, left, 34);
  w.put(`Generated ${doc.generatedOn}`, { font: "helvetica", weight: "normal", size: 8.5, color: "#CFE3DB", lh: 12 }, PAGE.w - left, 34, "right");
  w.put(REPORT_TITLE, { font: "times", weight: "bold", size: 28, color: C.white, lh: 36 }, left, 52);
  w.put(`${doc.id}  ·  ${doc.facts[1][1]}  ·  ${doc.payerName}`, { font: "helvetica", weight: "normal", size: 11, color: C.white, lh: 16 }, left, 90);
  if (doc.workedExample) {
    const t = "WORKED EXAMPLE";
    const s: Style = { font: "helvetica", weight: "bold", size: 7.2, color: C.white, lh: 11, track: 0.5 };
    const tw = w.textWidth(t, s) + 14;
    pdf.setDrawColor(C.white);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(PAGE.w - left - tw, 58, tw, 16, 8, 8, "S");
    w.put(t, s, PAGE.w - left - tw + 7, 60.5);
  }
  w.y = 118 + 22;

  // facts, two columns
  const colW = (width - 32 - 20) / 2;
  const cell = (k: string, v: string): { h: number; draw: (x: number, y: number) => void } => {
    const rows = w.wrap(v, { ...bodyBold, size: 10, lh: 14 }, colW);
    return { h: 12 + rows.length * 14 + 8, draw: (x, y) => { w.put(k.toUpperCase(), label, x, y); rows.forEach((r, i) => w.put(r, { ...bodyBold, size: 10, lh: 14 }, x, y + 12 + i * 14)); } };
  };
  const cells = doc.facts.map(([k, v]) => cell(k, v));
  const rows: { h: number; items: typeof cells }[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const items = cells.slice(i, i + 2);
    rows.push({ h: Math.max(...items.map((c) => c.h)), items });
  }
  const factsH = rows.reduce((a, r) => a + r.h, 0) + 24;
  pdf.setFillColor(C.tile);
  pdf.setDrawColor(C.tileEdge);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(left, w.y, width, factsH, 10, 10, "FD");
  let fy = w.y + 14;
  for (const r of rows) {
    r.items.forEach((c, i) => c.draw(left + 16 + i * (colW + 20), fy));
    fy += r.h;
  }
  w.y += factsH + 12;

  // verdict and chances, side by side
  const t = TONE[doc.verdict.tone];
  const vLines = w.wrap(doc.verdict.line, { ...small, size: 9 }, 196);
  const chanceRows = doc.chances.map(([k, v]) => ({ k, rows: w.wrap(v, { ...bodyBold, size: 10, lh: 14 }, 236) }));
  const noteRows = doc.chanceNote ? w.wrap(doc.chanceNote, { ...small, color: C.midInk }, 236) : [];
  const leftH = 14 + 12 + 24 + vLines.length * 12.5 + 14;
  const rightH = 14 + chanceRows.reduce((a, r) => a + 12 + r.rows.length * 14 + 6, 0) + (noteRows.length ? noteRows.length * 12.5 + 6 : 0) + 8;
  const vh = Math.max(leftH, rightH);
  pdf.setFillColor(t.bg);
  pdf.roundedRect(left, w.y, 232, vh, 10, 10, "F");
  w.put("OUR READ", { ...label, color: t.ink }, left + 16, w.y + 14);
  w.put(doc.verdict.word, { font: "times", weight: "bold", size: 17, color: t.ink, lh: 24 }, left + 16, w.y + 28);
  vLines.forEach((r, i) => w.put(r, { ...small, size: 9, color: t.ink }, left + 16, w.y + 56 + i * 12.5));
  let cy = w.y + 14;
  for (const r of chanceRows) {
    w.put(r.k.toUpperCase(), label, left + 256, cy);
    r.rows.forEach((x, i) => w.put(x, { ...bodyBold, size: 10, lh: 14 }, left + 256, cy + 12 + i * 14));
    cy += 12 + r.rows.length * 14 + 6;
  }
  noteRows.forEach((r, i) => w.put(r, { ...small, color: C.midInk }, left + 256, cy + i * 12.5));
  w.y += vh + 6;

  /* ---------- the sections ---------- */
  section(H.reasoning, [
    ...w.keep([
      ...w.lines(doc.reasoning.quote, { ...quote, color: C.riskInk }, left + 14, width - 14, (y, h) => { pdf.setFillColor(C.risk); pdf.rect(left, y, 2.4, h, "F"); }),
      w.gap(9),
      ...w.lines("WHERE IT PARTS FROM THE CHART", label, left, width),
      w.gap(2),
      ...w.lines(doc.reasoning.gap, body, left, width),
    ]),
  ]);

  section(H.synthesis, paras(doc.synthesis));

  const finding = (f: ReportDoc["findings"][number]): Op[] => {
    const tone: ReportTone = f.sev === "Critical" ? "risk" : "mid";
    const tw = w.textWidth(f.sev.toUpperCase(), { font: "helvetica", weight: "bold", size: 6.8, color: C.ink, track: 0.35 }) + 10 + 8;
    const x = left + IND;
    const titleStyle: Style = { ...bodyBold, size: 10.5, lh: 14.5 };
    const { first, rest } = w.wrapAfter(f.title, titleStyle, width - IND - tw, width - IND);
    const ops: Op[] = [
      { h: 14.5, draw: (y) => { badge(f.n, left, y); tag(f.sev, x, y + 0.5, tone, true); w.put(first, titleStyle, x + tw, y); } },
      ...rest.map((r): Op => ({ h: 14.5, draw: (y) => w.put(r, titleStyle, x, y) })),
      w.gap(4),
      ...w.lines(f.text, body, x, width - IND),
      w.gap(6),
      ...w.lines(`Source: ${f.source}`, smallBold, x, width - IND),
      w.gap(2),
      ...w.lines(f.excerpt, { ...quote, size: 9.5, lh: 13.5 }, x + 14, width - IND - 14, (y, h) => { pdf.setFillColor(C.line); pdf.rect(x + 1, y, 2.2, h, "F"); }),
      w.gap(6),
      ...w.lines(`Suggested fix: ${f.fix}`, small, x, width - IND),
      w.gap(3),
      { h: 14, draw: (y) => { statusTag(f.added, x, y); } },
      w.gap(14),
    ];
    return w.keep(ops);
  };
  const statusTag = (added: boolean, x: number, y: number) => {
    const s: Style = { font: "helvetica", weight: "bold", size: 6.8, color: added ? C.goodInk : C.muted, lh: 10, track: 0.35 };
    const text = added ? "ADDED TO THE EVIDENCE" : "NOT ADDED YET";
    const tw = w.textWidth(text, s) + (added ? 22 : 12);
    pdf.setFillColor(added ? C.goodBg : C.neutralBg);
    pdf.roundedRect(x, y + 1, tw, 12, 6, 6, "F");
    if (added) check(x + 6, y + 3, 7, C.good);
    w.put(text, s, x + (added ? 17 : 6), y + 2);
  };
  section(H.weak, doc.findings.flatMap(finding));

  if (doc.dims.length) {
    const dimOps = doc.dims.flatMap((d): Op[] =>
      w.keep([
        {
          h: 15,
          draw: (y) => {
            pdf.setFillColor(TONE[d.tone].fg);
            pdf.circle(left + 4.5, y + 7.5, 4, "F");
            w.put(d.name, { ...bodyBold, size: 10.5, lh: 15 }, left + 16, y);
            w.put(d.toneWord, { ...small, color: C.muted, lh: 15 }, left + 16 + w.textWidth(d.name, { ...bodyBold, size: 10.5 }) + 8, y);
          },
        },
        ...w.lines(d.text, body, left + 16, width - 16),
        w.gap(12),
      ]),
    );
    section(doc.dimsTitle ?? H.dims, [...(doc.dimsSub ? [...w.lines(doc.dimsSub, small, left, width), w.gap(6)] : []), ...dimOps]);
  }

  const recOps = doc.recommendations.flatMap((r, i): Op[] =>
    w.keep([
      ...w.lines(r.title, { ...bodyBold, size: 10.5, lh: 14.5 }, left + IND, width - IND).map((op, k): Op => (k ? op : { ...op, draw: (y) => { badge(i + 1, left, y); op.draw(y); } })),
      w.gap(3),
      ...w.lines(r.text, body, left + IND, width - IND),
      w.gap(13),
    ]),
  );
  section(H.todo, recOps);

  /* options: one block, like a small table */
  const cols = [112, 92, 96, 84, 120];
  const xs = cols.reduce<number[]>((a, c, i) => [...a, (a[i] ?? left) + c], [left]);
  const cellStyle: Style = { ...small, size: 8.3, lh: 11.5 };
  const optRows = doc.options.map((o) => {
    const cellsText = [w.wrap(o.title, { ...cellStyle, weight: "bold" }, cols[0] - 12), w.wrap(o.chance, cellStyle, cols[1] - 12), w.wrap(o.time, cellStyle, cols[2] - 12), w.wrap(o.gain, cellStyle, cols[3] - 12), o.needs.flatMap((n) => w.wrap(n, cellStyle, cols[4] - 20).map((l, k) => (k ? `  ${l}` : `- ${l}`)))];
    const lines = Math.max(...cellsText.map((c, i) => c.length + (i === 0 && o.recommended ? 1.6 : 0)));
    return { o, cellsText, h: lines * 11.5 + 14 };
  });
  const tableH = 20 + optRows.reduce((a, r) => a + r.h, 0);
  const table: Op = {
    h: tableH,
    draw: (y0) => {
      pdf.setFillColor(C.tile);
      pdf.rect(left, y0, width, 20, "F");
      ["Option", "Chance", "Time", "Gets back", "Needs"].forEach((hd, i) => w.put(hd.toUpperCase(), label, xs[i] + 6, y0 + 5));
      let y = y0 + 20;
      for (const r of optRows) {
        rule(y, left, left + width);
        r.cellsText.forEach((lines, i) => {
          const st: Style = i === 0 ? { ...cellStyle, weight: "bold", color: C.ink } : cellStyle;
          lines.forEach((l, k) => w.put(l, st, xs[i] + 6, y + 6 + k * 11.5));
        });
        if (r.o.recommended) tag("Recommended", xs[0] + 6, y + 6 + r.cellsText[0].length * 11.5, "good");
        y += r.h;
      }
      rule(y, left, left + width);
    },
  };
  section(H.options, [table]);

  section(H.criteria, bullets(doc.criteria));

  const fixOps = doc.fixes.flatMap((x): Op[] => {
    const rows = w.lines(`${x.text} (${x.source}). ${x.added ? "Added to the evidence." : "Not added yet."}`, small, left + 20, width - 20);
    rows[0] = { ...rows[0], draw: ((orig) => (y: number) => {
      pdf.setDrawColor(x.added ? C.good : C.faint);
      pdf.setLineWidth(0.9);
      pdf.roundedRect(left + 2, y + 2.5, 9, 9, 1.5, 1.5, "S");
      if (x.added) check(left + 3.5, y + 3.5, 6.5, C.good);
      orig(y);
    })(rows[0].draw) };
    return [...rows, w.gap(3)];
  });
  section(H.documents, [...bullets(doc.documents), w.gap(6), ...w.lines("FIXES FROM THE FINDINGS", label, left, width), w.gap(3), ...fixOps]);

  section(H.pushback, doc.pushback.flatMap(([q, a]) => w.keep([...w.lines(q, bodyBold, left, width), ...w.lines(a, body, left + 14, width - 14), w.gap(8)])));

  const askRows = w.wrap(doc.ask, { ...body, color: C.goodInk }, width - 28);
  const askH = askRows.length * 14 + 20;
  section(H.ask, [{ h: askH, draw: (y) => { pdf.setFillColor(C.goodBg); pdf.roundedRect(left, y, width, askH, 10, 10, "F"); askRows.forEach((r, i) => w.put(r, { ...body, color: C.goodInk }, left + 14, y + 10 + i * 14)); } }]);

  section(H.outlook, para(doc.outlook));

  const tl = doc.timeline.flatMap(([k, v]): Op[] => {
    const rows = w.wrap(v, body, width - 150);
    const h = Math.max(1, rows.length) * 14 + 8;
    return [{ h, draw: (y) => { w.put(k, bodyBold, left, y + 2); rows.forEach((r, i) => w.put(r, body, left + 150, y + 2 + i * 14)); rule(y + h - 1, left, left + width, C.tileEdge); } }];
  });
  section(H.timeline, w.keep(tl));

  section(H.method, [
    ...doc.agents.flatMap((a) => w.keep([...w.lines(a.text, body, left + 80, width - 80).map((op, k): Op => (k ? op : { ...op, draw: (y) => { w.put(a.name, bodyBold, left, y); op.draw(y); } })), w.gap(3)])),
    w.gap(5),
    ...bullets(doc.method),
  ]);

  /* ---------- running header and footer on every page ---------- */
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    pdf.setPage(p);
    if (p > 1) {
      w.put(`${doc.id}  ·  ${doc.payerName}`, { ...small, color: C.muted, size: 8 }, left, 28);
      w.put(REPORT_TITLE, { ...small, color: C.muted, size: 8 }, PAGE.w - left, 28, "right");
      rule(42);
    }
    rule(PAGE.h - 44);
    w.put(REPORT_FOOTER, { ...small, color: C.muted, size: 8 }, left, PAGE.h - 38);
    w.put(`Page ${p} of ${pages}`, { ...small, color: C.muted, size: 8 }, PAGE.w - left, PAGE.h - 38, "right");
  }
  return pdf;
}

/** Builds the PDF and hands it to the browser as a download named `Psyflo-appeal-analysis-<id>.pdf`. */
export async function downloadAppealReport(doc: ReportDoc): Promise<void> {
  const pdf = await buildAppealPdf(doc);
  pdf.save(doc.fileName);
}
