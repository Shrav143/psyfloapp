// `process` for the browser build. The server code reads a few environment variables; in the hosted preview there is no DATA_DIR (the file
// system is in memory) and the origins of the mock Client Record and portals are the virtual ones.
export const process = { env: { APP_PORT: '4000', PSYFLO_APP_URL: 'https://psyflo.invalid' }, platform: 'browser', cwd: () => '/app', argv: [], version: 'v22.0.0', versions: {}, nextTick: fn => queueMicrotask(fn) };
export default process;
