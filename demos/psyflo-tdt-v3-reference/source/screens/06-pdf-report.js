/* Round 11 (owner FLOW11): PSY.pdfReport(spec) → a valid, multi-page PDF (an ASCII string, for PSY.download) with real vector charts.
   spec = {
     title, subtitle, brand ('Psyflo · FLO report'), stamp (top-right text), footer (left footer text),
     blocks: [
       { h: 'Section heading' },
       { p: 'Paragraph text' },                              (wrapped)
       { note: 'Small muted text' },
       { kv: [['Label', 'Value'], …] },                       (key-value rows, values wrap)
       { table: { head: [...], rows: [[...], …], widths: [fractions] } },   (breaks across pages, repeats the header)
       { chart: C } (full width), { charts: [C] or [C, C] } (half-width columns, side by side)
       { pagebreak: true }
     ] }
   C = { type: 'bar' (vertical) | 'hbar' (horizontal) | 'pie' | 'donut', title, sub, data: [[label, value, colorHex?], …],
         series: ['Requested', 'Approved'] (hbar only: then each value is [v1, v2]), center: 'label under the total' (donut) }
   Drawing is plain PDF operators in the content stream (re f, m l S, Bézier c for the arcs), Helvetica / Helvetica-Bold with
   WinAnsiEncoding (· – — ’ “ ” • are written as octal escapes, so the file stays ASCII and string length = byte length).
   PSY.pdfReport.PALETTE: the categorical order used by FLO (validated: lightness band, chroma, CVD ΔE ≥ 9.7, contrast ≥ 3:1). */
(function () {
  const PSY = window.PSY;
  const PW = 612, PH = 792, ML = 50, MR = 50, MT = 56, MB = 54; const CW = PW - ML - MR;
  const PALETTE = ['#008F7A', '#D9692B', '#2A78D6', '#B88A0A', '#8B5FBF', '#D0506E'];
  const INK = '#1B1B19', MUTED = '#6B665E', LINE = '#E5DCD0', BRAND = '#1D4F43', HEAD_BG = '#EFE8DE', NONE = '#A8A196';

  /* Helvetica and Helvetica-Bold advance widths (1/1000 em), WinAnsi 32..126 */
  const W1 = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const W2 = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  /* the few non-ASCII characters the demo uses, as WinAnsi codes [code, regular width, bold width] */
  const HI = { '·': [0xB7, 278, 278], '–': [0x96, 556, 556], '—': [0x97, 1000, 1000], '’': [0x92, 222, 278], '‘': [0x91, 222, 278], '“': [0x93, 333, 500], '”': [0x94, 333, 500],
    '•': [0x95, 350, 350], '×': [0xD7, 584, 584], 'é': [0xE9, 556, 556], '…': [0x85, 1000, 1000] };
  const SUB = { '→': '->', '←': '<-', '≈': '~', '≥': '>=', '≤': '<=', '✓': '', '✕': 'x', ' ': ' ', ' ': ' ', ' ': ' ' };
  /* text → [{c: code, w1, w2}] */
  function glyphs(s) {
    const out = [];
    for (const ch of String(s == null ? '' : s)) {
      if (SUB[ch] != null) { for (const x of SUB[ch]) out.push({ c: x.charCodeAt(0), w1: W1[x.charCodeAt(0) - 32], w2: W2[x.charCodeAt(0) - 32] }); continue; }
      const k = ch.charCodeAt(0);
      if (k >= 32 && k <= 126) { out.push({ c: k, w1: W1[k - 32], w2: W2[k - 32] }); continue; }
      if (HI[ch]) { out.push({ c: HI[ch][0], w1: HI[ch][1], w2: HI[ch][2] }); continue; }
      if (k === 10 || k === 9) { out.push({ c: 32, w1: 278, w2: 278 }); continue; }
      out.push({ c: 63, w1: 556, w2: 611 }); // '?'
    }
    return out;
  }
  const width = (s, size, bold) => glyphs(s).reduce((a, g) => a + (bold ? g.w2 : g.w1), 0) * size / 1000;
  const lit = (s) => '(' + glyphs(s).map((g) => (g.c === 40 || g.c === 41 || g.c === 92 ? '\\' + String.fromCharCode(g.c) : g.c > 126 ? '\\' + g.c.toString(8) : String.fromCharCode(g.c))).join('') + ')';
  /* greedy word wrap to a width; very long words are cut */
  function wrap(s, maxW, size, bold) {
    const lines = [];
    String(s == null ? '' : s).split('\n').forEach((para) => {
      let cur = '';
      para.split(/\s+/).filter((w) => w !== '').forEach((w) => {
        const t = cur ? cur + ' ' + w : w;
        if (width(t, size, bold) <= maxW) { cur = t; return; }
        if (cur) lines.push(cur);
        cur = w;
        while (width(cur, size, bold) > maxW && cur.length > 1) { let k = cur.length - 1; while (k > 1 && width(cur.slice(0, k), size, bold) > maxW) k--; lines.push(cur.slice(0, k)); cur = cur.slice(k); }
      });
      lines.push(cur);
    });
    return lines.length ? lines : [''];
  }
  const fit1 = (s, maxW, size, bold) => { s = String(s == null ? '' : s); if (width(s, size, bold) <= maxW) return s; while (s.length > 1 && width(s + '…', size, bold) > maxW) s = s.slice(0, -1); return s.replace(/\s+$/, '') + '…'; };
  const rgb = (hex) => { const h = String(hex || INK).replace('#', ''); return [0, 2, 4].map((i) => (parseInt(h.substr(i, 2), 16) / 255).toFixed(3)).join(' '); };
  const n2 = (x) => (Math.round(x * 100) / 100).toString();

  /* ---------------- the document: pages of operators, a top-down cursor ---------------- */
  function Doc() { this.pages = []; this.y = 0; this.newPage(); }
  Doc.prototype.newPage = function () { this.cur = { ops: [] }; this.pages.push(this.cur); this.y = PH - MT; };
  Doc.prototype.need = function (h) { if (this.y - h < MB) { this.newPage(); return true; } return false; };
  Doc.prototype.op = function (s) { this.cur.ops.push(s); };
  Doc.prototype.text = function (x, y, s, o) {
    o = o || {}; const size = o.size || 10; const bold = !!o.bold; let tx = x;
    if (o.align === 'right') tx = x - width(s, size, bold); else if (o.align === 'center') tx = x - width(s, size, bold) / 2;
    this.op('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + rgb(o.color || INK) + ' rg 1 0 0 1 ' + n2(tx) + ' ' + n2(y) + ' Tm ' + lit(s) + ' Tj ET');
  };
  Doc.prototype.rect = function (x, y, w, h, color) { this.op(rgb(color) + ' rg ' + n2(x) + ' ' + n2(y) + ' ' + n2(w) + ' ' + n2(h) + ' re f'); };
  Doc.prototype.line = function (x1, y1, x2, y2, color, lw) { this.op(n2(lw || 0.6) + ' w ' + rgb(color || LINE) + ' RG ' + n2(x1) + ' ' + n2(y1) + ' m ' + n2(x2) + ' ' + n2(y2) + ' l S'); };
  /* a bar with rounded data-end (r) anchored on the baseline side */
  Doc.prototype.bar = function (x, y, w, h, color, dir) {
    const r = Math.min(2.5, w / 2, h / 2); if (h <= 0 || w <= 0) return;
    if (r < 0.8) { this.rect(x, y, w, h, color); return; }
    const k = 0.5523 * r; let p;
    if (dir === 'up') p = [x, y, 'm', x + w, y, 'l', x + w, y + h - r, 'l', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h, 'c', x + r, y + h, 'l', x + r - k, y + h, x, y + h - r + k, x, y + h - r, 'c'];
    else p = [x, y, 'm', x + w - r, y, 'l', x + w - r + k, y, x + w, y + r - k, x + w, y + r, 'c', x + w, y + h - r, 'l', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h, 'c', x, y + h, 'l'];
    const s = []; let buf = []; p.forEach((t) => { if (typeof t === 'string') { s.push(buf.map(n2).join(' ') + ' ' + t); buf = []; } else buf.push(t); });
    this.op(rgb(color) + ' rg ' + s.join(' ') + ' h f');
  };
  /* arc as Bézier segments (≤ 90° each); a0/a1 in radians, counter-clockwise positive; returns the path without the move-to */
  function arc(cx, cy, r, a0, a1) {
    const out = []; const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2))); const d = (a1 - a0) / n;
    for (let i = 0; i < n; i++) {
      const s = a0 + i * d, e = s + d; const k = (4 / 3) * Math.tan((e - s) / 4) * r;
      const p0 = [cx + r * Math.cos(s), cy + r * Math.sin(s)], p3 = [cx + r * Math.cos(e), cy + r * Math.sin(e)];
      const p1 = [p0[0] - k * Math.sin(s), p0[1] + k * Math.cos(s)], p2 = [p3[0] + k * Math.sin(e), p3[1] - k * Math.cos(e)];
      out.push([p1, p2, p3].map((p) => n2(p[0]) + ' ' + n2(p[1])).join(' ') + ' c');
    }
    return out.join(' ');
  }
  Doc.prototype.slice = function (cx, cy, r, ri, a0, a1, color) {
    const p0 = n2(cx + r * Math.cos(a0)) + ' ' + n2(cy + r * Math.sin(a0)) + ' m ';
    let path = p0 + arc(cx, cy, r, a0, a1);
    if (ri > 0) path += ' ' + n2(cx + ri * Math.cos(a1)) + ' ' + n2(cy + ri * Math.sin(a1)) + ' l ' + arc(cx, cy, ri, a1, a0);
    else path += ' ' + n2(cx) + ' ' + n2(cy) + ' l';
    this.op(rgb(color) + ' rg ' + path + ' h f');
  };

  /* ---------------- charts ---------------- */
  const niceStep = (max) => (max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : max <= 250 ? 50 : 100);
  const total = (data) => data.reduce((a, d) => a + (+d[1] || 0), 0);
  const colorOf = (d, i) => d[2] || PALETTE[i % PALETTE.length];
  function chartHeight(C, w) {
    const head = C.sub ? 30 : 18;
    if (C.type === 'bar') return head + 150;
    if (C.type === 'hbar') return head + (C.series ? 18 : 4) + Math.max(1, C.data.length) * (C.series ? 26 : 20) + 8;
    return head + Math.max(112, legendRows(C, 0, Math.min(w, 380)).reduce((a, r) => a + r.lines.length * 10.5 + 5, 12)); // pie / donut
  }
  function drawChart(doc, C, x, top, w) {
    doc.text(x, top - 11, C.title || '', { size: 10.5, bold: true });
    if (C.sub) doc.text(x, top - 24, fit1(C.sub, w, 8, false), { size: 8, color: MUTED });
    const y0 = top - (C.sub ? 30 : 18); const data = C.data || [];
    if (!data.length) { doc.text(x, y0 - 16, 'No data', { size: 9, color: MUTED }); return; }
    if (C.type === 'bar') {
      const h = 150; const left = x + 22, right = x + w - 4, base = y0 - h + 30, topY = y0 - 14; const plotH = topY - base;
      const max = Math.max(1, ...data.map((d) => +d[1] || 0)); const step = niceStep(max); const vmax = Math.ceil(max / step) * step;
      for (let v = 0; v <= vmax; v += step) { const yy = base + (v / vmax) * plotH; doc.line(left, yy, right, yy, v === 0 ? '#9A9388' : LINE, v === 0 ? 0.8 : 0.5); doc.text(left - 5, yy - 3, String(v), { size: 7.5, color: MUTED, align: 'right' }); }
      const slot = (right - left) / data.length; const bw = Math.min(34, slot * 0.58);
      data.forEach((d, i) => {
        const v = +d[1] || 0; const bx = left + i * slot + (slot - bw) / 2; const bh = (v / vmax) * plotH;
        doc.bar(bx, base, bw, bh, d[2] || C.color || PALETTE[0], 'up');
        if (v > 0) doc.text(bx + bw / 2, base + bh + 4, String(v), { size: 8.5, bold: true, align: 'center' });
        wrap(d[0], slot - 4, 8, false).slice(0, 2).forEach((ln, k) => doc.text(left + i * slot + slot / 2, base - 12 - k * 9.5, ln, { size: 8, color: MUTED, align: 'center' }));
      });
      return;
    }
    if (C.type === 'hbar') {
      let yy = y0 - 4;
      if (C.series) { // legend
        let lx = x; C.series.forEach((s, i) => { doc.rect(lx, yy - 8, 8, 8, i === 0 ? NONE : PALETTE[0]); doc.text(lx + 12, yy - 7.5, s, { size: 8, color: MUTED }); lx += 22 + width(s, 8, false); }); yy -= 18;
      }
      const labW = Math.min(w * 0.42, 150); const bx = x + labW + 6; const bwMax = w - labW - 6 - 30;
      const vals = data.map((d) => (C.series ? d[1] : [d[1]])).reduce((a, v) => a.concat(v), []); const max = Math.max(1, ...vals.map((v) => +v || 0));
      data.forEach((d, i) => {
        const rowH = C.series ? 26 : 20; const cy = yy - rowH / 2;
        doc.text(x, cy - 3, fit1(d[0], labW, 8.5, false), { size: 8.5 });
        const vs = C.series ? d[1] : [d[1]]; const bh = C.series ? 8 : 11;
        vs.forEach((v, k) => {
          const by = C.series ? cy + (k === 0 ? 1 : -9) : cy - bh / 2; const bw = ((+v || 0) / max) * bwMax;
          doc.bar(bx, by, Math.max(bw, v ? 1.5 : 0), bh, C.series ? (k === 0 ? NONE : PALETTE[0]) : (d[2] || C.color || PALETTE[0]), 'right');
          doc.text(bx + bw + 4, by + bh / 2 - 3, String(v == null ? '-' : v), { size: 8, bold: !C.series || k === 1, color: INK });
        });
        yy -= rowH;
      });
      doc.line(bx, y0 - (C.series ? 22 : 4), bx, yy + 2, '#9A9388', 0.8);
      return;
    }
    /* pie / donut, from 12 o'clock clockwise, 1 pt surface gaps between slices, legend on the right */
    w = Math.min(w, 380); const tot = total(data); const r = 46; const cx = x + r + 4, cy = y0 - 8 - r; const ri = C.type === 'donut' ? r * 0.58 : 0;
    let a = Math.PI / 2;
    data.forEach((d, i) => { const v = +d[1] || 0; if (!v) return; const da = (v / tot) * Math.PI * 2; doc.slice(cx, cy, r, ri, a, a - da, colorOf(d, i)); a -= da; });
    if (data.filter((d) => +d[1] > 0).length > 1) { a = Math.PI / 2; data.forEach((d) => { const v = +d[1] || 0; if (!v) return; doc.line(cx + ri * Math.cos(a), cy + ri * Math.sin(a), cx + (r + 1) * Math.cos(a), cy + (r + 1) * Math.sin(a), '#FFFFFF', 1.4); a -= (v / tot) * Math.PI * 2; }); }
    if (ri) { doc.text(cx, cy - 2, String(tot), { size: 15, bold: true, align: 'center' }); if (C.center) doc.text(cx, cy - 13, C.center, { size: 7.5, color: MUTED, align: 'center' }); }
    const lx = cx + r + 18; let ly = y0 - 12;
    legendRows(C, x, w).forEach((row, i) => {
      doc.rect(lx, ly - 1, 8, 8, colorOf(data[i], i));
      row.lines.forEach((ln, k) => doc.text(lx + 13, ly - k * 10.5, ln, { size: 8.5 }));
      doc.text(x + w, ly, row.val, { size: 8.5, bold: true, align: 'right' });
      ly -= row.lines.length * 10.5 + 5;
    });
  }
  /* legend rows of a pie / donut: label (up to 2 lines) + "n · pct%" */
  function legendRows(C, x, w) {
    const data = C.data || []; const tot = total(data); const lw = w - (46 * 2 + 4 + 18);
    return data.map((d) => {
      const v = +d[1] || 0; const val = v + ' · ' + (tot ? Math.round((v / tot) * 100) : 0) + '%'; const room = lw - 13 - width(val, 8.5, true) - 8;
      const ls = wrap(d[0], room, 8.5, false); const lines = ls.length > 2 ? [ls[0], fit1(ls.slice(1).join(' '), room, 8.5, false)] : ls;
      return { lines, val };
    });
  }

  /* ---------------- blocks ---------------- */
  function layout(doc, spec) {
    /* first-page title */
    wrap(spec.title || 'Report', CW, 19, true).forEach((ln) => { doc.text(ML, doc.y - 17, ln, { size: 19, bold: true, color: BRAND }); doc.y -= 24; });
    if (spec.subtitle) { wrap(spec.subtitle, CW, 10, false).forEach((ln) => { doc.text(ML, doc.y - 10, ln, { size: 10, color: MUTED }); doc.y -= 14; }); }
    doc.y -= 6; doc.line(ML, doc.y, PW - MR, doc.y, BRAND, 1.2); doc.y -= 14;
    (spec.blocks || []).forEach((b) => {
      if (b.pagebreak) { doc.newPage(); return; }
      if (b.h != null) { doc.need(46); doc.y -= 6; doc.text(ML, doc.y - 12, b.h, { size: 12.5, bold: true, color: BRAND }); doc.y -= 22; return; }
      if (b.p != null || b.note != null) {
        const note = b.note != null; const size = note ? 8.5 : 10; const lead = note ? 11.5 : 14;
        wrap(note ? b.note : b.p, CW, size, false).forEach((ln) => { doc.need(lead); doc.text(ML, doc.y - size, ln, { size, color: note ? MUTED : INK }); doc.y -= lead; });
        doc.y -= 6; return;
      }
      if (b.kv) {
        const kw = 112;
        b.kv.forEach(([k, v]) => {
          const lines = wrap(v, CW - kw, 9.5, false); doc.need(lines.length * 13 + 4);
          doc.text(ML, doc.y - 9.5, k, { size: 8.5, bold: true, color: MUTED });
          lines.forEach((ln, i) => doc.text(ML + kw, doc.y - 9.5 - i * 13, ln, { size: 9.5 }));
          doc.y -= lines.length * 13 + 3;
        });
        doc.y -= 6; return;
      }
      if (b.table) { table(doc, b.table); return; }
      if (b.chart || b.charts) {
        const cs = b.charts || [b.chart]; const gap = 22; const w = b.chart ? CW : (CW - gap) / 2; // { chart } = full width · { charts } = two columns
        const h = Math.max(...cs.map((C) => chartHeight(C, w))); doc.need(h + 12);
        cs.forEach((C, i) => drawChart(doc, C, ML + i * (w + gap), doc.y, w));
        doc.y -= h + 14;
      }
    });
  }
  function table(doc, T) {
    const head = T.head || []; const n = head.length; const fr = T.widths || head.map(() => 1 / n); const sum = fr.reduce((a, b) => a + b, 0);
    const ws = fr.map((f) => (f / sum) * CW); const xs = ws.reduce((a, w, i) => { a.push(i ? a[i - 1] + ws[i - 1] : ML); return a; }, []);
    const pad = 4, size = 8.5, lead = 11;
    const drawHead = () => {
      const hl = head.map((h, i) => wrap(h, ws[i] - pad * 2, 8, true)); const hh = Math.max(...hl.map((l) => l.length)) * 10 + 8;
      doc.need(hh + lead + 8);
      doc.rect(ML, doc.y - hh, CW, hh, HEAD_BG);
      hl.forEach((ls, i) => ls.forEach((ln, k) => doc.text(xs[i] + pad, doc.y - 11 - k * 10, ln, { size: 8, bold: true, color: '#4A453D' })));
      doc.y -= hh;
    };
    drawHead();
    (T.rows || []).forEach((row) => {
      const cl = row.map((c, i) => wrap(c, ws[i] - pad * 2, size, i === 0));
      const rh = Math.max(...cl.map((l) => l.length)) * lead + 8;
      if (doc.y - rh < MB) { doc.newPage(); drawHead(); }
      cl.forEach((ls, i) => ls.forEach((ln, k) => doc.text(xs[i] + pad, doc.y - 12 - k * lead, ln, { size, bold: i === 0 })));
      doc.y -= rh; doc.line(ML, doc.y, PW - MR, doc.y, LINE, 0.6);
    });
    doc.y -= 12;
  }

  /* ---------------- assemble ---------------- */
  PSY.pdfReport = (spec) => {
    spec = spec || {}; const doc = new Doc(); layout(doc, spec);
    const N = doc.pages.length;
    doc.pages.forEach((pg, i) => {
      const o = []; const keep = doc.cur; doc.cur = { ops: o };
      doc.text(ML, PH - 30, spec.brand || 'Psyflo', { size: 8.5, bold: true, color: BRAND });
      if (spec.stamp) doc.text(PW - MR, PH - 30, spec.stamp, { size: 8, color: MUTED, align: 'right' });
      doc.line(ML, MB - 16, PW - MR, MB - 16, LINE, 0.6);
      if (spec.footer) doc.text(ML, MB - 28, fit1(spec.footer, CW - 70, 7.5, false), { size: 7.5, color: MUTED });
      doc.text(PW - MR, MB - 28, 'Page ' + (i + 1) + ' of ' + N, { size: 7.5, color: MUTED, align: 'right' });
      doc.cur = keep; pg.ops = o.concat(pg.ops);
    });
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(''); const pagesId = add('');
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const info = add('<< /Title ' + lit(spec.title || 'Report') + ' /Producer (Psyflo FLO) /Creator (Psyflo) >>');
    const kids = [];
    doc.pages.forEach((pg) => {
      const stream = pg.ops.join('\n');
      const c = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
    });
    objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  };
  PSY.pdfReport.PALETTE = PALETTE;
  PSY.pdfReport.NONE = NONE;
  PSY.pdfReport.textWidth = width;
})();
