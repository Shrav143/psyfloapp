// A small Buffer for the browser build: only what server/pdf.js, util.js and the signature actions use.
const fromBinary = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
const toBinary = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
export class Buffer extends Uint8Array {
  static from(v, enc) {
    let u8;
    if (typeof v === 'string') {
      if (enc === 'base64') u8 = fromBinary(atob(v.replace(/[\s]/g, '').replace(/-/g, '+').replace(/_/g, '/')));
      else if (enc === 'latin1' || enc === 'binary' || enc === 'ascii') u8 = fromBinary(v);
      else if (enc === 'hex') { u8 = new Uint8Array(v.length >> 1); for (let i = 0; i < u8.length; i++) u8[i] = parseInt(v.substr(i * 2, 2), 16); }
      else u8 = new TextEncoder().encode(v);
    } else if (v instanceof ArrayBuffer) u8 = new Uint8Array(v);
    else u8 = Uint8Array.from(v);
    const b = new Buffer(u8.length); b.set(u8); return b;
  }
  static alloc(n) { return new Buffer(n); }
  static isBuffer(b) { return b instanceof Buffer; }
  static concat(list) {
    const n = list.reduce((a, b) => a + b.length, 0); const out = new Buffer(n); let o = 0;
    for (const b of list) { out.set(b, o); o += b.length; }
    return out;
  }
  toString(enc = 'utf8') {
    if (enc === 'latin1' || enc === 'binary' || enc === 'ascii') return toBinary(this);
    if (enc === 'base64') return btoa(toBinary(this));
    if (enc === 'hex') return Array.from(this, x => x.toString(16).padStart(2, '0')).join('');
    return new TextDecoder().decode(this);
  }
  readUInt16BE(o = 0) { return (this[o] << 8) | this[o + 1]; }
}
