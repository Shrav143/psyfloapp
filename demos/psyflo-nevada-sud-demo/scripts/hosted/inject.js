export { Buffer } from './shim-buffer.js';
export { process } from './shim-process.js';
// `new Function(...)` is not available in a published page. The build rewrites any left in the app's scripts to call this (see build-hosted.mjs).
export const __hnf = () => { throw new Error('new Function is not available in the hosted page'); };
