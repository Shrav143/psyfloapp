// Start and stop one instance of the three servers (Psyflo app, mock Lauris, mock portals) with a fresh DATA_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, ports, urls } from './env.mjs';

const live = new Set();
export async function startInstance({ index = 0, base, dataDir, time = '15:30', env = {} }) {
  const p = ports(base, index); const u = urls(base, index);
  fs.rmSync(dataDir, { recursive: true, force: true }); fs.mkdirSync(dataDir, { recursive: true });
  const log = fs.openSync(path.join(dataDir, 'server.log'), 'a');
  const child = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, stdio: ['ignore', log, log],
    env: { ...process.env, APP_PORT: String(p.app), LAURIS_PORT: String(p.lauris), EXT_PORT: String(p.ext), DATA_DIR: dataDir, DEMO_TIME: time, DEMO_TEST: '1', ...env } });
  const inst = { pid: child.pid, child, urls: u, ports: p, dataDir, exited: false };
  child.on('exit', () => { inst.exited = true; live.delete(inst); });
  live.add(inst);
  await waitReady(u.APP, 15000, inst);
  return inst;
}
export async function waitReady(app, ms = 15000, inst) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (inst && inst.exited) throw new Error('server exited at start; see ' + path.join(inst.dataDir, 'server.log'));
    try { const r = await fetch(app + '/api/config'); if (r.ok) return; } catch { }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('server did not answer at ' + app);
}
export async function stopInstance(inst) {
  if (!inst || inst.exited) return;
  try { process.kill(inst.pid, 'SIGTERM'); } catch { }
  const t0 = Date.now();
  while (!inst.exited && Date.now() - t0 < 3000) await new Promise(r => setTimeout(r, 100));
  if (!inst.exited) { try { process.kill(inst.pid, 'SIGKILL'); } catch { } }
}
export async function stopAll() { await Promise.all([...live].map(stopInstance)); }
