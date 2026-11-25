// `node:url` for the browser build: file URLs map to the virtual posix paths.
export const fileURLToPath = u => { const s = typeof u === 'string' ? u : u && u.href; return decodeURIComponent(String(s || 'file:///app/index.js').replace(/^file:\/\//, '')); };
export const pathToFileURL = p => new URL('file://' + encodeURI(String(p)));
export default { fileURLToPath, pathToFileURL, URL, URLSearchParams };
