// pdfReport(spec) -> a valid multi-page PDF as an ASCII string (pure ESM: the browser wraps it in a Blob, the tests parse it). Ported from the v3
// demo's report builder: plain PDF operators, Helvetica and Helvetica-Bold (WinAnsi), real vector bars. No library, no network.
//
// spec = { title, subtitle, brand, stamp, footer, blocks:[
//   { h:'Section heading' } · { p:'Paragraph' } · { note:'Small muted text' } · { kv:[['Label','Value'],…] }
//   · { table:{ head:[…], rows:[[…],…], widths:[fractions], align:['left'|'right',…] } }      (breaks across pages, repeats the header)
//   · { chart:{ type:'bar'|'hbar', title, data:[[label, value, colorHex?],…] } } · { pagebreak:true } ] }
const PW = 612, PH = 792, ML = 50, MR = 50, MT = 56, MB = 54; const CW = PW - ML - MR;
const INK = '#1B1B19', MUTED = '#5A544B', LINE = '#E5DCD0', BRAND = '#15605E', HEAD_BG = '#EFE8DE', BAR = '#217A78', GRID = '#857F75';

/* Helvetica and Helvetica-Bold advance widths (1/1000 em), WinAnsi 32..126 */
const W1 = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W2 = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const HI = { '·': [0xB7, 278, 278], '–': [0x96, 556, 556], '—': [0x97, 1000, 1000], '’': [0x92, 222, 278], '‘': [0x91, 222, 278], '“': [0x93, 333, 500], '”': [0x94, 333, 500], '•': [0x95, 350, 350], '×': [0xD7, 584, 584], 'é': [0xE9, 556, 556], '…': [0x85, 1000, 1000] };
const SUB = { '→': '->', '←': '<-', '≈': '~', '≥': '>=', '≤': '<=', '✓': '', '✕': 'x', ' ': ' ', ' ': ' ' };
function glyphs(s) {
  const out = [];
  for (const ch of String(s == null ? '' : s)) {
    if (SUB[ch] != null) { for (const x of SUB[ch]) out.push({ c: x.charCodeAt(0), w1: W1[x.charCodeAt(0) - 32], w2: W2[x.charCodeAt(0) - 32] }); continue; }
    const k = ch.charCodeAt(0);
    if (k >= 32 && k <= 126) { out.push({ c: k, w1: W1[k - 32], w2: W2[k - 32] }); continue; }
    if (HI[ch]) { out.push({ c: HI[ch][0], w1: HI[ch][1], w2: HI[ch][2] }); continue; }
    if (k === 10 || k === 9) { out.push({ c: 32, w1: 278, w2: 278 }); continue; }
    out.push({ c: 63, w1: 556, w2: 611 });
  }
  return out;
}
export const textWidth = (s, size, bold) => glyphs(s).reduce((a, g) => a + (bold ? g.w2 : g.w1), 0) * size / 1000;
const lit = s => '(' + glyphs(s).map(g => (g.c === 40 || g.c === 41 || g.c === 92 ? '\\' + String.fromCharCode(g.c) : g.c > 126 ? '\\' + g.c.toString(8) : String.fromCharCode(g.c))).join('') + ')';
function wrap(s, maxW, size, bold) {
  const lines = [];
  String(s == null ? '' : s).split('\n').forEach(para => {
    let cur = '';
    para.split(/\s+/).filter(w => w !== '').forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (textWidth(t, size, bold) <= maxW) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = w;
      while (textWidth(cur, size, bold) > maxW && cur.length > 1) { let k = cur.length - 1; while (k > 1 && textWidth(cur.slice(0, k), size, bold) > maxW) k--; lines.push(cur.slice(0, k)); cur = cur.slice(k); }
    });
    lines.push(cur);
  });
  return lines.length ? lines : [''];
}
const fit1 = (s, maxW, size, bold) => { s = String(s == null ? '' : s); if (textWidth(s, size, bold) <= maxW) return s; while (s.length > 1 && textWidth(s + '…', size, bold) > maxW) s = s.slice(0, -1); return s.replace(/\s+$/, '') + '…'; };
const rgb = hex => { const h = String(hex || INK).replace('#', ''); return [0, 2, 4].map(i => (parseInt(h.substr(i, 2), 16) / 255).toFixed(3)).join(' '); };
const n2 = x => (Math.round(x * 100) / 100).toString();

class Doc {
  constructor() { this.pages = []; this.y = 0; this.newPage(); }
  newPage() { this.cur = { ops: [] }; this.pages.push(this.cur); this.y = PH - MT; }
  need(h) { if (this.y - h < MB) { this.newPage(); return true; } return false; }
  op(s) { this.cur.ops.push(s); }
  text(x, y, s, o = {}) {
    const size = o.size || 10, bold = !!o.bold; let tx = x;
    if (o.align === 'right') tx = x - textWidth(s, size, bold); else if (o.align === 'center') tx = x - textWidth(s, size, bold) / 2;
    this.op('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + rgb(o.color || INK) + ' rg 1 0 0 1 ' + n2(tx) + ' ' + n2(y) + ' Tm ' + lit(s) + ' Tj ET');
  }
  rect(x, y, w, h, color) { this.op(rgb(color) + ' rg ' + n2(x) + ' ' + n2(y) + ' ' + n2(w) + ' ' + n2(h) + ' re f'); }
  line(x1, y1, x2, y2, color, lw) { this.op(n2(lw || 0.6) + ' w ' + rgb(color || LINE) + ' RG ' + n2(x1) + ' ' + n2(y1) + ' m ' + n2(x2) + ' ' + n2(y2) + ' l S'); }
}
const niceStep = max => (max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : max <= 250 ? 50 : max <= 1000 ? 200 : 500);
function chartHeight(C) { return 18 + (C.type === 'hbar' ? Math.max(1, (C.data || []).length) * 20 + 8 : 150); }
function drawChart(doc, C, x, top, w) {
  doc.text(x, top - 11, C.title || '', { size: 10.5, bold: true });
  const y0 = top - 18; const data = C.data || [];
  if (!data.length) { doc.text(x, y0 - 16, 'No data', { size: 9, color: MUTED }); return; }
  if (C.type === 'bar') {
    const h = 150, left = x + 30, right = x + w - 4, base = y0 - h + 30, topY = y0 - 14, plotH = topY - base;
    const max = Math.max(1, ...data.map(d => +d[1] || 0)); const step = niceStep(max); const vmax = Math.ceil(max / step) * step;
    for (let v = 0; v <= vmax; v += step) { const yy = base + (v / vmax) * plotH; doc.line(left, yy, right, yy, v === 0 ? GRID : LINE, v === 0 ? 0.8 : 0.5); doc.text(left - 5, yy - 3, String(v), { size: 7.5, color: MUTED, align: 'right' }); }
    const slot = (right - left) / data.length; const bw = Math.min(34, slot * 0.58);
    data.forEach((d, i) => { const v = +d[1] || 0; const bx = left + i * slot + (slot - bw) / 2; const bh = (v / vmax) * plotH; doc.rect(bx, base, bw, bh, d[2] || BAR); if (v > 0) doc.text(bx + bw / 2, base + bh + 3, String(v), { size: 8, bold: true, align: 'center' });
      wrap(d[0], slot - 4, 8, false).slice(0, 2).forEach((ln, k) => doc.text(left + i * slot + slot / 2, base - 12 - k * 9.5, ln, { size: 8, color: MUTED, align: 'center' })); });
    return;
  }
  let yy = y0 - 4; const labW = Math.min(w * 0.42, 150), bx = x + labW + 6, bwMax = w - labW - 6 - 30; const max = Math.max(1, ...data.map(d => +d[1] || 0));
  data.forEach(d => { const cy = yy - 10; doc.text(x, cy - 3, fit1(d[0], labW, 8.5, false), { size: 8.5 }); const bw = ((+d[1] || 0) / max) * bwMax; doc.rect(bx, cy - 5.5, Math.max(bw, d[1] ? 1.5 : 0), 11, d[2] || BAR); doc.text(bx + bw + 4, cy - 3, String(d[1] == null ? '-' : d[1]), { size: 8, bold: true }); yy -= 20; });
  doc.line(bx, y0 - 4, bx, yy + 2, GRID, 0.8);
}
function table(doc, T) {
  const head = T.head || []; const n = head.length; const fr = T.widths || head.map((_, i) => (i === 0 ? 2 : 1)); const sum = fr.reduce((a, b) => a + b, 0);
  const ws = fr.map(f => (f / sum) * CW); const xs = ws.reduce((a, w, i) => { a.push(i ? a[i - 1] + ws[i - 1] : ML); return a; }, []);
  const pad = 4, size = 8.5, lead = 11; const al = T.align || [];
  const put = (ls, i, y, o) => ls.forEach((ln, k) => doc.text(al[i] === 'right' ? xs[i] + ws[i] - pad : xs[i] + pad, y - k * (o.lead), ln, { size: o.size, bold: o.bold, color: o.color, align: al[i] === 'right' ? 'right' : 'left' }));
  const drawHead = () => {
    const hl = head.map((h, i) => wrap(h, ws[i] - pad * 2, 8, true)); const hh = Math.max(...hl.map(l => l.length)) * 10 + 8; doc.need(hh + lead + 8);
    doc.rect(ML, doc.y - hh, CW, hh, HEAD_BG); hl.forEach((ls, i) => put(ls, i, doc.y - 11, { size: 8, bold: true, color: '#4A453D', lead: 10 })); doc.y -= hh;
  };
  if (!n) return; drawHead();
  (T.rows || []).forEach(row => {
    const cl = row.map((c, i) => wrap(c, ws[i] - pad * 2, size, i === 0)); const rh = Math.max(...cl.map(l => l.length)) * lead + 8;
    if (doc.y - rh < MB) { doc.newPage(); drawHead(); }
    cl.forEach((ls, i) => put(ls, i, doc.y - 12, { size, bold: i === 0, lead }));
    doc.y -= rh; doc.line(ML, doc.y, PW - MR, doc.y, LINE, 0.6);
  });
  doc.y -= 12;
}
function layout(doc, spec) {
  wrap(spec.title || 'Report', CW, 19, true).forEach(ln => { doc.text(ML, doc.y - 17, ln, { size: 19, bold: true, color: BRAND }); doc.y -= 24; });
  if (spec.subtitle) wrap(spec.subtitle, CW, 10, false).forEach(ln => { doc.text(ML, doc.y - 10, ln, { size: 10, color: MUTED }); doc.y -= 14; });
  doc.y -= 6; doc.line(ML, doc.y, PW - MR, doc.y, BRAND, 1.2); doc.y -= 14;
  (spec.blocks || []).forEach(b => {
    if (b.pagebreak) { doc.newPage(); return; }
    if (b.h != null) { doc.need(46); doc.y -= 6; doc.text(ML, doc.y - 12, b.h, { size: 12.5, bold: true, color: BRAND }); doc.y -= 22; return; }
    if (b.p != null || b.note != null) { const note = b.note != null; const size = note ? 8.5 : 10, lead = note ? 11.5 : 14; wrap(note ? b.note : b.p, CW, size, false).forEach(ln => { doc.need(lead); doc.text(ML, doc.y - size, ln, { size, color: note ? MUTED : INK }); doc.y -= lead; }); doc.y -= 6; return; }
    if (b.kv) { const kw = 112; b.kv.forEach(([k, v]) => { const lines = wrap(v, CW - kw, 9.5, false); doc.need(lines.length * 13 + 4); doc.text(ML, doc.y - 9.5, k, { size: 8.5, bold: true, color: MUTED }); lines.forEach((ln, i) => doc.text(ML + kw, doc.y - 9.5 - i * 13, ln, { size: 9.5 })); doc.y -= lines.length * 13 + 3; }); doc.y -= 6; return; }
    if (b.table) { table(doc, b.table); return; }
    if (b.chart) { const h = chartHeight(b.chart); doc.need(h + 12); drawChart(doc, b.chart, ML, doc.y, CW); doc.y -= h + 14; }
  });
}
export function pdfReport(spec = {}) {
  const doc = new Doc(); layout(doc, spec); const N = doc.pages.length;
  doc.pages.forEach((pg, i) => {
    const o = []; const keep = doc.cur; doc.cur = { ops: o };
    doc.text(ML, PH - 30, spec.brand || 'Psyflo', { size: 8.5, bold: true, color: BRAND });
    if (spec.stamp) doc.text(PW - MR, PH - 30, spec.stamp, { size: 8, color: MUTED, align: 'right' });
    doc.line(ML, MB - 16, PW - MR, MB - 16, LINE, 0.6);
    if (spec.footer) doc.text(ML, MB - 28, fit1(spec.footer, CW - 70, 7.5, false), { size: 7.5, color: MUTED });
    doc.text(PW - MR, MB - 28, 'Page ' + (i + 1) + ' of ' + N, { size: 7.5, color: MUTED, align: 'right' });
    doc.cur = keep; pg.ops = o.concat(pg.ops);
  });
  const objs = []; const add = s => { objs.push(s); return objs.length; };
  const catalog = add(''), pagesId = add('');
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const info = add('<< /Title ' + lit(spec.title || 'Report') + ' /Producer (Psyflo demo) /Creator (Psyflo) >>');
  const kids = [];
  doc.pages.forEach(pg => {
    const stream = pg.ops.join('\n'); const c = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
    kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
  });
  objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return out;
}
export const pdfPageCount = pdf => (String(pdf).match(/\/Type \/Page /g) || []).length;
// text a PDF carries (for tests): every (...) Tj string, in order
export const pdfTexts = pdf => [...String(pdf).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(m => m[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
