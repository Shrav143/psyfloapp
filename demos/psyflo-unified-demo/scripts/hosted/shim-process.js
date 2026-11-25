// `process` for the browser build. The server code reads a few environment variables; in the hosted preview presenter mode is on
// (DEMO_PRESENTER is not "0"), there is no PIN, no fixed time of day, no test seeding, and the three origins are the virtual ones.
export const process = { env: { APP_PORT: '4000', PSYFLO_APP_URL: 'https://psyflo.invalid', DEMO_PRESENTER: '1' }, platform: 'browser', cwd: () => '/app', argv: [], version: 'v22.0.0', versions: {}, nextTick: fn => queueMicrotask(fn) };
export default process;
