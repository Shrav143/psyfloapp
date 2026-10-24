/* An export as a table: CSV or tab-separated text (also what a spreadsheet puts on the clipboard), or the first sheet of an XLSX workbook.
   Everything is read in the browser; nothing is uploaded. The column mapping is guessed from the header names and the first row's values. */
import { IMPORT_FIELDS, icdOf, isField, isoDate, makeDoc, payerOf, programOf, sexOf, toField } from "./fields";
import type { ImportTarget, ImportedDocument, ImportedField } from "./types";

export interface Table {
  headers: string[];
  rows: string[][];
}

/** RFC 4180 CSV, or tab-separated when the first line has tabs. Quoted cells may hold commas, quotes ("") and line breaks. Empty lines are dropped. */
export function parseDelimited(text: string): Table {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = firstLine.includes("\t") ? "\t" : firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    out.push(row);
  }
  const lines = out.filter((r) => r.some((x) => x.trim() !== "")).map((r) => r.map((x) => x.trim()));
  const width = Math.max(0, ...lines.map((r) => r.length));
  const [head = [], ...rows] = lines.map((r) => [...r, ...Array(width - r.length).fill("")]);
  return { headers: head.map((h, i) => h || `Column ${i + 1}`), rows };
}

/* ------------------------------------------------------------------ XLSX: a zip of XML parts */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The files of a zip by name, read from its central directory. Stored and deflated entries only, which is what spreadsheet programs write. */
async function unzip(buf: ArrayBuffer, wanted: (name: string) => boolean): Promise<Map<string, string>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = new Map<string, string>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    files.set(name, dec.decode(method === 0 ? raw : await inflate(raw)));
  }
  return files;
}

const colIndex = (ref: string): number => {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
const unescapeXml = (s: string): string => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
/** A spreadsheet date serial (days since 1899-12-30) as m/d/yyyy, for cells in a date column. */
const serialDate = (n: number): string => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
};

/** The first sheet of an XLSX workbook as a table. Shared strings and inline strings are read; numbers in a column whose header says date are read as dates. */
export async function parseXlsx(buf: ArrayBuffer): Promise<Table> {
  const files = await unzip(buf, (n) => n === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const sheetName = [...files.keys()].filter((n) => n.startsWith("xl/worksheets/")).sort()[0];
  if (!sheetName) throw new Error("No sheet");
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unescapeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const grid: string[][] = [];
  for (const r of (files.get(sheetName) ?? "").matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const line: string[] = [];
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/t="(\w+)"/)?.[1];
      const body = c[2] ?? "";
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      const text = type === "s" ? shared[Number(v)] ?? "" : type === "inlineStr" ? unescapeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")) : unescapeXml(v);
      line[ref ? colIndex(ref) : line.length] = text;
    }
    grid.push(Array.from(line, (x) => x ?? ""));
  }
  const width = Math.max(0, ...grid.map((r) => r.length));
  const lines = grid.map((r) => [...r, ...Array(width - r.length).fill("")].map((x) => x.trim())).filter((r) => r.some(Boolean));
  const [head = [], ...rows] = lines;
  const dateCols = head.map((h) => /date|dob|birth|admit|effective|start|end/i.test(h));
  return { headers: head.map((h, i) => h || `Column ${i + 1}`), rows: rows.map((r) => r.map((x, i) => (dateCols[i] && /^\d{4,5}(\.\d+)?$/.test(x) ? serialDate(Number(x)) : x))) };
}

/* ------------------------------------------------------------------ guessing the mapping */
export const SKIP = "skip";
const norm = (s: string): string => s.toLowerCase().replace(/[_\-./#]+/g, " ").replace(/\s+/g, " ").trim();

/** How well a value fits a field, from 0 to 1, when the header says nothing. */
function valueFit(key: string, v: string): number {
  if (!v) return 0;
  if (key === "payerId") return payerOf(v) ? 1 : 0;
  if (key === "program") return programOf(v) ? 0.9 : 0;
  if (key === "diagnosis" || key === "priorDx") return icdOf(v) ? 0.9 : 0;
  if (key === "sex") return sexOf(v) ? 0.8 : 0;
  if (key === "initials") return /^([A-Z]\.?\s?){2,3}$/.test(v) ? 0.8 : 0;
  if (key === "memberId") return /^[A-Z]{1,3}\d{6,}$/i.test(v.replace(/\W/g, "")) ? 0.7 : 0;
  if (key === "dob" || key === "startDate" || key === "decisionDate") return isoDate(v) ? 0.3 : 0;
  return 0;
}

/** One Psyflo field per column, or Skip. A header that names a field wins; otherwise the first row's value decides. A field is used once. */
export function autoMap(table: Table, target: ImportTarget): string[] {
  const defs = IMPORT_FIELDS[target];
  const used = new Set<string>();
  const sample = table.rows[0] ?? [];
  const byHeader = table.headers.map((h) => {
    const n = norm(h);
    let best: { key: string; score: number } | null = null;
    for (const d of defs) {
      for (const a of d.aliases) {
        const score = n === a ? 3 + a.length / 100 : n.includes(a) ? 1 + a.length / 100 : 0;
        if (score > (best?.score ?? 0)) best = { key: d.key, score };
      }
    }
    return best;
  });
  const out = table.headers.map(() => SKIP);
  /* Strongest header matches first, so "Plan type" takes planType before "Plan name" can. */
  const order = byHeader.map((b, i) => ({ i, b })).filter((x) => x.b).sort((a, b) => (b.b?.score ?? 0) - (a.b?.score ?? 0));
  for (const { i, b } of order) {
    if (b && !used.has(b.key)) {
      out[i] = b.key;
      used.add(b.key);
    }
  }
  table.headers.forEach((_, i) => {
    if (out[i] !== SKIP) return;
    const fit = defs.filter((d) => !used.has(d.key)).map((d) => ({ key: d.key, s: valueFit(d.key, sample[i] ?? "") })).sort((a, b) => b.s - a.s)[0];
    if (fit && fit.s >= 0.7) {
      out[i] = fit.key;
      used.add(fit.key);
    }
  });
  return out;
}

/* ------------------------------------------------------------------ the mapped table as what was found */
export interface TableRead {
  fields: ImportedField[];
  documents: ImportedDocument[];
  unread: { key: string; label: string; problem: string }[];
}

/** One row of the table (every row for a document list) read through the mapping. Columns that become documents ("Last note", "Prior diagnoses") are added as documents. */
export function readTable(table: Table, mapping: string[], row: number, target: ImportTarget): TableRead {
  const out: TableRead = { fields: [], documents: [], unread: [] };
  const col = (key: string): number => mapping.indexOf(key);
  if (target === "documents") {
    const t = col("docTitle");
    const d = col("docDate");
    for (const r of table.rows) {
      const title = t >= 0 ? r[t] : "";
      if (title) out.documents.push(makeDoc(title, d >= 0 ? isoDate(r[d] ?? "") ?? undefined : undefined));
    }
    return out;
  }
  const cells = table.rows[row] ?? [];
  mapping.forEach((key, i) => {
    if (key === SKIP) return;
    const raw = (cells[i] ?? "").trim();
    const def = IMPORT_FIELDS[target].find((f) => f.key === key);
    if (!def || !raw) return;
    if (def.document === "note") {
      const when = isoDate(raw);
      out.documents.push(when ? makeDoc("Progress note", when) : makeDoc(raw));
      return;
    }
    if (def.document === "diagnoses") {
      out.documents.push(makeDoc(`Diagnosis history (${raw})`));
      return;
    }
    const f = toField(target, key, raw);
    if (isField(f)) out.fields.push(f);
    else out.unread.push({ key, label: f.label, problem: `“${f.raw}”: ${f.problem.toLowerCase()}` });
  });
  return out;
}
