// Minimal PDF writer: Helvetica text with simple wrapping, optional JPEG (e.g. a finger signature).
// Enough for proofs (signed forms, consents, fax cover, binder stubs). No dependencies.

function pdfStr(s) {
  // WinAnsi-ish: map a few typographic characters, drop the rest outside Latin-1
  s = String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/·/g, '·').replace(/→/g, '->').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[☐☑☒]/g, m => m === '☐' ? '[ ]' : '[x]').replace(/×/g, 'x');
  s = s.replace(/[^\x20-\xff]/g, '');
  return '(' + s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
}

function wrap(text, size, width) {
  const maxChars = Math.floor(width / (size * 0.5));
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      if ((line + ' ' + w).trim().length > maxChars) { if (line) out.push(line); line = w; }
      else line = (line + ' ' + w).trim();
    }
    out.push(line);
  }
  return out;
}

// blocks: [{text, size?, bold?, gap?}] or {image: Buffer(jpeg), w, h, width?}
export function makePdf(blocks, { title = 'Document' } = {}) {
  const W = 612, H = 792, M = 54;
  const pages = []; let ops = []; let y = H - M; const images = [];
  const newPage = () => { pages.push(ops); ops = []; y = H - M; };
  for (const b of blocks) {
    if (b.image) {
      const dispW = b.width || 220; const dispH = dispW * (b.h / b.w);
      if (y - dispH < M) newPage();
      const name = 'Im' + images.length; images.push({ name, buf: b.image, w: b.w, h: b.h, page: pages.length });
      y -= dispH;
      ops.push(`q ${dispW} 0 0 ${dispH.toFixed(1)} ${M} ${y.toFixed(1)} cm /${name} Do Q`);
      y -= 8; continue;
    }
    const size = b.size || 10; const font = b.bold ? 'F2' : 'F1';
    y -= (b.gap ?? 4);
    for (const line of wrap(b.text ?? '', size, W - 2 * M)) {
      if (y - size < M) newPage();
      y -= size * 1.35;
      ops.push(`BT /${font} ${size} Tf ${M} ${y.toFixed(1)} Td ${pdfStr(line)} Tj ET`);
    }
  }
  pages.push(ops);

  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const catalog = add(null), pagesObj = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const imgObjs = images.map(im => ({ ...im, obj: add({ stream: im.buf, dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.buf.length} >>` }) }));
  const pageIds = [];
  pages.forEach((p, i) => {
    const footer = `BT /F1 8 Tf ${M} 30 Td ${pdfStr(title + ' - page ' + (i + 1) + ' of ' + pages.length + ' - Demo data, nothing is real')} Tj ET`;
    const content = Buffer.from(p.concat(footer).join('\n'), 'latin1');
    const c = add({ stream: content, dict: `<< /Length ${content.length} >>` });
    const xo = imgObjs.filter(im => im.page === i).map(im => `/${im.name} ${im.obj} 0 R`).join(' ');
    pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${c} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> ${xo ? '/XObject << ' + xo + ' >>' : ''} >> >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map(i => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;

  const parts = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = parts[0].length; const xref = [];
  objs.forEach((o, i) => {
    xref.push(offset);
    let buf;
    if (o && o.stream) buf = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n${o.dict}\nstream\n`, 'latin1'), o.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    else buf = Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
    parts.push(buf); offset += buf.length;
  });
  const xrefStart = offset;
  let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + xref.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  x += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info << /Title ${pdfStr(title)} /Producer (Psyflo demo) >> >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(x, 'latin1'));
  return Buffer.concat(parts);
}

export function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) return null;
    const marker = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xC3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
