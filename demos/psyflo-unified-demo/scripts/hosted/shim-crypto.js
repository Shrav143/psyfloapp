// `node:crypto` for the browser build: session.js asks for random bytes to mint a session token.
import { Buffer } from './shim-buffer.js';
export const randomBytes = n => { const b = Buffer.alloc(n); crypto.getRandomValues(b); return b; };
export default { randomBytes };
